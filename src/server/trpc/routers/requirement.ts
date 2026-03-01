import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { createTRPCRouter, protectedProcedure } from '../init'
import { prisma } from '@/server/db/client'
import { FiveLayerModelSchema, CreateRequirementSchema } from '@/lib/schemas/requirement'
import { eventBus } from '@/server/events/bus'
import { assertTransition, RequirementStatusEnum } from '@/lib/workflow/status-machine'
import type { RequirementStatus } from '@/lib/workflow/status-machine'

export const requirementRouter = createTRPCRouter({
  create: protectedProcedure
    .input(CreateRequirementSchema)
    .mutation(async ({ input, ctx }) => {
      const requirement = await prisma.requirement.create({
        data: {
          title: input.title,
          rawInput: input.rawInput,
          createdBy: ctx.session.userId,
        },
      })

      eventBus.emit('requirement.created', {
        requirementId: requirement.id,
        createdBy: ctx.session.userId,
      })

      return requirement
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const requirement = await prisma.requirement.findUnique({
        where: { id: input.id },
      })

      if (!requirement) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Requirement not found',
        })
      }

      return requirement
    }),

  list: protectedProcedure
    .input(z.object({ status: RequirementStatusEnum.optional() }).optional())
    .query(async ({ input }) => {
      return prisma.requirement.findMany({
        where: input?.status ? { status: input.status } : undefined,
        orderBy: { updatedAt: 'desc' },
      })
    }),

  updateModel: protectedProcedure
    .input(z.object({
      id: z.string(),
      model: FiveLayerModelSchema,
      confidence: z.record(z.string(), z.number()).optional(),
      changeSource: z.enum(['manual', 'ai-structure', 'ai-converse', 'assumption']).default('manual'),
    }))
    .mutation(async ({ input, ctx }) => {
      const requirement = await prisma.$transaction(async (tx) => {
        const current = await tx.requirement.findUniqueOrThrow({
          where: { id: input.id },
          select: { model: true, version: true, confidence: true },
        })

        if (current.model !== null) {
          await tx.requirementVersion.create({
            data: {
              requirementId: input.id,
              version: current.version,
              model: current.model,
              confidence: current.confidence ?? undefined,
              changeSource: input.changeSource,
              createdBy: ctx.session.userId,
            },
          })
        }

        return tx.requirement.update({
          where: { id: input.id },
          data: {
            model: input.model,
            confidence: input.confidence ?? undefined,
            version: { increment: 1 },
          },
        })
      })

      eventBus.emit('requirement.version.created', {
        requirementId: requirement.id,
        version: requirement.version,
        previousVersion: requirement.version - 1,
        createdBy: ctx.session.userId,
      })

      eventBus.emit('requirement.updated', {
        requirementId: requirement.id,
        updatedBy: ctx.session.userId,
        field: 'model',
      })

      return requirement
    }),

  transitionStatus: protectedProcedure
    .input(z.object({ id: z.string(), to: RequirementStatusEnum }))
    .mutation(async ({ input, ctx }) => {
      const current = await prisma.requirement.findUniqueOrThrow({
        where: { id: input.id },
        select: { id: true, status: true },
      })

      try {
        assertTransition(current.status as RequirementStatus, input.to)
      } catch (err) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: err instanceof Error ? err.message : 'Invalid status transition',
        })
      }

      const updated = await prisma.requirement.update({
        where: { id: input.id, status: current.status },
        data: { status: input.to },
      })

      eventBus.emit('requirement.status.changed', {
        requirementId: updated.id,
        from: current.status,
        to: input.to,
        changedBy: ctx.session.userId,
      })

      return updated
    }),
})
