import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { createTRPCRouter, protectedProcedure } from '../init'
import { prisma } from '@/server/db/client'
import { FiveLayerModelSchema, CreateRequirementSchema } from '@/lib/schemas/requirement'
import { eventBus } from '@/server/events/bus'

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
    .input(z.object({ status: z.string().optional() }).optional())
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
    }))
    .mutation(async ({ input, ctx }) => {
      const requirement = await prisma.requirement.update({
        where: { id: input.id },
        data: {
          model: input.model,
          confidence: input.confidence ?? undefined,
          version: { increment: 1 },
        },
      })

      eventBus.emit('requirement.updated', {
        requirementId: requirement.id,
        updatedBy: ctx.session.userId,
        field: 'model',
      })

      return requirement
    }),
})
