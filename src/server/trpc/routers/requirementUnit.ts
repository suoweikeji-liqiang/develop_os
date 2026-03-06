import { z } from 'zod'
import { createTRPCRouter, protectedProcedure } from '../init'
import { prisma } from '@/server/db/client'

export const requirementUnitRouter = createTRPCRouter({
  listByRequirement: protectedProcedure
    .input(z.object({ requirementId: z.string() }))
    .query(async ({ input }) => {
      return prisma.requirementUnit.findMany({
        where: { requirementId: input.requirementId },
        orderBy: [
          { sortOrder: 'asc' },
          { createdAt: 'asc' },
        ],
        select: {
          id: true,
          unitKey: true,
          title: true,
          summary: true,
          layer: true,
          status: true,
          stabilityLevel: true,
          stabilityScore: true,
          stabilityReason: true,
          ownerId: true,
          sourceType: true,
          sourceRef: true,
          updatedAt: true,
          _count: {
            select: {
              issueUnits: true,
              childUnits: true,
            },
          },
        },
      })
    }),
})
