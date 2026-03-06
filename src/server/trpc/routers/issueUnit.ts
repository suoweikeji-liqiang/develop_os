import { z } from 'zod'
import { createTRPCRouter, protectedProcedure } from '../init'
import { prisma } from '@/server/db/client'

export const issueUnitRouter = createTRPCRouter({
  listByRequirement: protectedProcedure
    .input(z.object({ requirementId: z.string() }))
    .query(async ({ input }) => {
      return prisma.issueUnit.findMany({
        where: { requirementId: input.requirementId },
        orderBy: [
          { blockDev: 'desc' },
          { updatedAt: 'desc' },
        ],
        select: {
          id: true,
          type: true,
          severity: true,
          title: true,
          description: true,
          status: true,
          blockDev: true,
          sourceType: true,
          sourceRef: true,
          suggestedResolution: true,
          ownerId: true,
          updatedAt: true,
          primaryRequirementUnit: {
            select: {
              id: true,
              unitKey: true,
              title: true,
            },
          },
        },
      })
    }),
})
