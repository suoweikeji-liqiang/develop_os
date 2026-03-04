import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { createTRPCRouter, protectedProcedure } from '../init'
import { prisma } from '@/server/db/client'
import { retrieveRelevantChunks, type RetrievedChunk } from '@/server/ai/rag/retrieve'
import { runAgent } from '@/server/agents/registry'
import type { FiveLayerModel } from '@/lib/schemas/requirement'
import '@/server/agents'

export const testCaseRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ requirementId: z.string() }))
    .query(async ({ input }) => {
      const requirement = await prisma.requirement.findUnique({
        where: { id: input.requirementId },
        select: { id: true, version: true },
      })

      if (!requirement) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Requirement not found' })
      }

      const items = await prisma.requirementTestCaseSuite.findMany({
        where: { requirementId: input.requirementId },
        orderBy: { createdAt: 'desc' },
      })

      return {
        currentRequirementVersion: requirement.version,
        items,
      }
    }),

  generate: protectedProcedure
    .input(z.object({ requirementId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const requirement = await prisma.requirement.findUnique({
        where: { id: input.requirementId },
        select: {
          id: true,
          title: true,
          rawInput: true,
          model: true,
          version: true,
        },
      })

      if (!requirement) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Requirement not found' })
      }

      if (!requirement.model) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: '请先生成或完善 ModelCard，再生成测试用例',
        })
      }

      let ragContext: RetrievedChunk[] = []
      try {
        const model = requirement.model as FiveLayerModel
        const query = [
          requirement.title,
          requirement.rawInput,
          model.goal.summary,
          ...model.scenario.normal.slice(0, 1).map((item) => item.name),
          ...model.verifiability.automated.slice(0, 2).map((item) => item.criterion),
        ].join('\n')
        ragContext = await retrieveRelevantChunks(query, 4)
      } catch (error) {
        console.error('[test-cases] retrieval failed, proceeding without context:', error)
      }

      const result = await runAgent<{
        requirementId: string
        title: string
        rawInput: string
        model: FiveLayerModel
        sourceVersion: number
        ragContext: typeof ragContext
      }, {
        success: boolean
        suite?: unknown
        error?: unknown
      }>('test-case-generator', {
        requirementId: requirement.id,
        title: requirement.title,
        rawInput: requirement.rawInput,
        model: requirement.model as FiveLayerModel,
        sourceVersion: requirement.version,
        ragContext,
      }, {
        userId: ctx.session.userId,
        requirementId: requirement.id,
      })

      if (!result.success || !result.suite) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: '生成测试用例失败',
          cause: result.error,
        })
      }

      return prisma.requirementTestCaseSuite.create({
        data: {
          requirementId: requirement.id,
          sourceRequirementVersion: requirement.version,
          suite: result.suite,
          generatedBy: ctx.session.userId,
        },
      })
    }),
})
