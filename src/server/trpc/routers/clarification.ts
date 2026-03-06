import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { Prisma } from '@/generated/prisma/client'
import { createTRPCRouter, protectedProcedure } from '../init'
import { prisma } from '@/server/db/client'
import { FiveLayerModelSchema } from '@/lib/schemas/requirement'
import { applyPathPatch, deriveClarificationPatch } from '@/server/ai/clarification'
import { IssueUnitSeverityEnum } from '@/lib/requirement-evolution'

function toInputJsonValue(value: unknown): Prisma.InputJsonValue | null {
  if (value === null) return null
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value
  }
  if (Array.isArray(value)) {
    return value.map((item) => toInputJsonValue(item)) as Prisma.InputJsonArray
  }
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, toInputJsonValue(item)]),
    ) as Prisma.InputJsonObject
  }

  return null
}

export const clarificationRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ requirementId: z.string() }))
    .query(async ({ input }) => {
      const session = await prisma.clarificationSession.findFirst({
        where: { requirementId: input.requirementId },
        include: {
          questions: {
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      })

      return session
    }),

  answer: protectedProcedure
    .input(z.object({ questionId: z.string(), answerText: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const question = await prisma.clarificationQuestion.findUnique({
        where: { id: input.questionId },
        include: { session: { include: { requirement: true } } },
      })

      if (!question) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Question not found' })
      }

      const requirement = question.session.requirement
      if (!requirement.model) {
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Requirement model not initialized' })
      }

      const recent = await prisma.modelChangeLog.findFirst({
        where: {
          requirementId: requirement.id,
          changeSource: 'ai-converse',
          createdAt: { gte: new Date(Date.now() - 60_000) },
        },
      })
      if (recent) {
        throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: '一分钟内仅允许一次澄清回答应用' })
      }

      const parsedModel = FiveLayerModelSchema.parse(requirement.model)
      const parsed = await deriveClarificationPatch({
        questionId: question.id,
        questionText: question.questionText,
        answerText: input.answerText,
        currentModel: parsedModel,
      })

      let nextModel = parsedModel
      for (const patch of parsed.modelPatch) {
        nextModel = applyPathPatch(nextModel, patch.path, patch.value)
      }
      nextModel = FiveLayerModelSchema.parse(nextModel)
      const patchJson = parsed.modelPatch.map((patch) => ({
        ...patch,
        value: toInputJsonValue(patch.value),
      })) as Prisma.InputJsonArray

      const updatedRequirement = await prisma.$transaction(async (tx) => {
        const current = await tx.requirement.findUniqueOrThrow({
          where: { id: requirement.id },
          select: { model: true, version: true, confidence: true },
        })

        if (current.model !== null) {
          await tx.requirementVersion.create({
            data: {
              requirementId: requirement.id,
              version: current.version,
              model: current.model,
              confidence: current.confidence ?? undefined,
              changeSource: 'ai-converse',
              createdBy: ctx.session.userId,
            },
          })
        }

        await tx.modelChangeLog.create({
          data: {
            requirementId: requirement.id,
            changeSource: 'ai-converse',
            patchJson,
            rationale: parsed.modelPatch.map((item) => item.rationale).join('; ').slice(0, 500),
            confidence: parsed.modelPatch.length
              ? parsed.modelPatch.reduce((sum, item) => sum + item.confidence, 0) / parsed.modelPatch.length
              : null,
            evidenceRefs: [question.id],
          },
        })

        await tx.clarificationQuestion.update({
          where: { id: question.id },
          data: {
            answerText: input.answerText,
            status: parsed.resolved ? 'RESOLVED' : 'ANSWERED',
          },
        })

        return tx.requirement.update({
          where: { id: requirement.id },
          data: {
            model: nextModel,
            version: { increment: 1 },
          },
        })
      })

      if (requirement.status === 'IN_REVIEW') {
        await prisma.reviewSignoff.deleteMany({ where: { requirementId: requirement.id } })
      }

      return {
        model: updatedRequirement.model,
        questionId: question.id,
        questionStatus: parsed.resolved ? 'RESOLVED' : 'ANSWERED',
        patches: parsed.modelPatch,
      }
    }),

  updateQuestionStatus: protectedProcedure
    .input(z.object({ questionId: z.string(), status: z.enum(['OPEN', 'ANSWERED', 'RESOLVED', 'SKIPPED']) }))
    .mutation(async ({ input }) => {
      return prisma.clarificationQuestion.update({
        where: { id: input.questionId },
        data: { status: input.status },
      })
    }),

  createIssue: protectedProcedure
    .input(z.object({
      questionId: z.string(),
      severity: IssueUnitSeverityEnum.optional(),
      blockDev: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const question = await prisma.clarificationQuestion.findUnique({
        where: { id: input.questionId },
        include: {
          session: {
            select: {
              requirementId: true,
            },
          },
        },
      })

      if (!question) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Question not found' })
      }

      const existing = await prisma.issueUnit.findFirst({
        where: {
          requirementId: question.session.requirementId,
          sourceType: 'clarification',
          sourceRef: question.id,
        },
        select: {
          id: true,
          status: true,
        },
      })

      if (existing) {
        return {
          created: false,
          issueId: existing.id,
          status: existing.status,
        }
      }

      const severity = input.severity ?? (question.category === 'RISK' ? 'HIGH' : 'MEDIUM')
      const blockDev = input.blockDev ?? false
      const type = question.category === 'RISK' ? 'risk' : 'pending_confirmation'
      const titlePrefix = question.category === 'RISK' ? '澄清风险项' : '澄清待确认项'

      const issue = await prisma.issueUnit.create({
        data: {
          requirementId: question.session.requirementId,
          type,
          severity,
          title: `${titlePrefix}: ${question.questionText.slice(0, 80)}`,
          description: [
            `澄清问题：${question.questionText}`,
            question.answerText ? `当前回答：${question.answerText}` : null,
            `澄清状态：${question.status}`,
          ].filter(Boolean).join('\n'),
          status: 'OPEN',
          blockDev,
          sourceType: 'clarification',
          sourceRef: question.id,
          suggestedResolution: '确认该澄清问题，并将结论回填到 Requirement Unit 或 ModelCard。',
          createdBy: ctx.session.userId,
        },
        select: {
          id: true,
          status: true,
        },
      })

      return {
        created: true,
        issueId: issue.id,
        status: issue.status,
      }
    }),
})
