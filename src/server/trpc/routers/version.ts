import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { createTRPCRouter, protectedProcedure } from '../init'
import { prisma } from '@/server/db/client'

export const versionRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ requirementId: z.string() }))
    .query(async ({ input }) => {
      const [versions, latestTrace] = await Promise.all([
        prisma.requirementVersion.findMany({
          where: { requirementId: input.requirementId },
          select: {
            id: true,
            version: true,
            changeSource: true,
            createdBy: true,
            createdAt: true,
            changeUnit: {
              select: {
                id: true,
                changeKey: true,
                title: true,
              },
            },
          },
          orderBy: { version: 'desc' },
        }),
        prisma.modelChangeLog.findFirst({
          where: {
            requirementId: input.requirementId,
            changeUnitId: { not: null },
          },
          select: {
            id: true,
            changeSource: true,
            createdAt: true,
            changeUnit: {
              select: {
                id: true,
                changeKey: true,
                title: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
      ])

      return {
        versions,
        currentTrace: latestTrace
          ? {
              kind: 'modelChangeLog' as const,
              changeSource: latestTrace.changeSource,
              createdAt: latestTrace.createdAt,
              changeUnit: latestTrace.changeUnit,
            }
          : null,
      }
    }),

  getTwo: protectedProcedure
    .input(z.object({
      requirementId: z.string(),
      versionA: z.number().int().positive(),
      versionB: z.number().int().positive(),
    }))
    .query(async ({ input }) => {
      const requirement = await prisma.requirement.findUniqueOrThrow({
        where: { id: input.requirementId },
        select: { version: true, model: true, confidence: true },
      })

      const fetchVersion = async (ver: number) => {
        if (ver === requirement.version) {
          return {
            version: requirement.version,
            model: requirement.model,
            confidence: requirement.confidence,
          }
        }

        const snapshot = await prisma.requirementVersion.findUnique({
          where: {
            requirementId_version: {
              requirementId: input.requirementId,
              version: ver,
            },
          },
          select: { version: true, model: true, confidence: true },
        })

        if (!snapshot) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: `Version ${ver} not found for requirement ${input.requirementId}`,
          })
        }

        return snapshot
      }

      const [versionA, versionB] = await Promise.all([
        fetchVersion(input.versionA),
        fetchVersion(input.versionB),
      ])

      return { versionA, versionB }
    }),
})
