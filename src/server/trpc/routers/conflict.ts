import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { createTRPCRouter, protectedProcedure } from '../init'
import { prisma } from '@/server/db/client'
import { eventBus } from '@/server/events/bus'
import { ConflictStatusSchema } from '@/lib/schemas/conflict'
import { scanRequirementConflicts } from '@/server/conflicts/service'

export const conflictRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({
      requirementId: z.string(),
      status: ConflictStatusSchema.optional(),
    }))
    .query(async ({ input }) => {
      return prisma.requirementConflict.findMany({
        where: {
          requirementId: input.requirementId,
          ...(input.status ? { status: input.status } : {}),
        },
        include: {
          relatedRequirement: {
            select: { id: true, title: true },
          },
        },
        orderBy: [
          { status: 'asc' },
          { severity: 'desc' },
          { updatedAt: 'desc' },
        ],
      })
    }),

  scan: protectedProcedure
    .input(z.object({ requirementId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      return scanRequirementConflicts({
        requirementId: input.requirementId,
        userId: ctx.session.userId,
      })
    }),

  updateStatus: protectedProcedure
    .input(z.object({
      conflictId: z.string(),
      status: ConflictStatusSchema,
      resolutionNote: z.string().trim().max(500).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const existing = await prisma.requirementConflict.findUnique({
        where: { id: input.conflictId },
        select: { id: true, requirementId: true },
      })

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Conflict not found' })
      }

      const updated = await prisma.requirementConflict.update({
        where: { id: input.conflictId },
        data: {
          status: input.status,
          resolutionNote: input.status === 'OPEN' ? null : input.resolutionNote ?? null,
          reviewedAt: input.status === 'OPEN' ? null : new Date(),
        },
      })

      eventBus.emit('requirement.conflict.updated', {
        requirementId: existing.requirementId,
        conflictId: updated.id,
        status: updated.status,
        updatedBy: ctx.session.userId,
      })

      return updated
    }),
})
