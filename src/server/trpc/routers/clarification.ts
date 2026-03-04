import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { createTRPCRouter, protectedProcedure } from '../init'
import { prisma } from '@/server/db/client'
import { FiveLayerModelSchema } from '@/lib/schemas/requirement'
import { applyPathPatch, deriveClarificationPatch } from '@/server/ai/clarification'

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
            patchJson: parsed.modelPatch,
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
})
