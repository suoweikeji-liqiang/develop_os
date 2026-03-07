import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { createTRPCRouter, protectedProcedure } from '../init'
import { prisma } from '@/server/db/client'
import { RequirementStabilityLevelEnum, RequirementUnitStatusEnum } from '@/lib/requirement-evolution'
import { normalizeRequirementUnitLayer } from '@/lib/requirement-unit-layer'
import { deriveRequirementUnitsFromModel } from '@/server/requirements/requirement-units'

const CreateRequirementUnitInput = z.object({
  requirementId: z.string(),
  title: z.string().trim().min(1).max(120),
  summary: z.string().trim().min(1).max(2000),
  layer: z.string().trim().min(1).max(40),
})

const UpdateRequirementUnitInput = z.object({
  requirementUnitId: z.string(),
  title: z.string().trim().min(1).max(120),
  summary: z.string().trim().min(1).max(2000),
  layer: z.string().trim().min(1).max(40),
})

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

  create: protectedProcedure
    .input(CreateRequirementUnitInput)
    .mutation(async ({ input, ctx }) => {
      const requirement = await prisma.requirement.findUnique({
        where: { id: input.requirementId },
        select: { id: true },
      })

      if (!requirement) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Requirement not found' })
      }

      const [count, maxOrder] = await prisma.$transaction([
        prisma.requirementUnit.count({
          where: { requirementId: input.requirementId },
        }),
        prisma.requirementUnit.aggregate({
          where: { requirementId: input.requirementId },
          _max: { sortOrder: true },
        }),
      ])

      const unitKey = `RU-${String(count + 1).padStart(2, '0')}`

      return prisma.requirementUnit.create({
        data: {
          requirementId: input.requirementId,
          unitKey,
          title: input.title,
          summary: input.summary,
          layer: normalizeRequirementUnitLayer(input.layer),
          sourceType: 'manual',
          status: 'DRAFT',
          stabilityLevel: 'S0_IDEA',
          sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
          createdBy: ctx.session.userId,
        },
      })
    }),

  update: protectedProcedure
    .input(UpdateRequirementUnitInput)
    .mutation(async ({ input }) => {
      return prisma.requirementUnit.update({
        where: { id: input.requirementUnitId },
        data: {
          title: input.title,
          summary: input.summary,
          layer: normalizeRequirementUnitLayer(input.layer),
        },
        select: {
          id: true,
          title: true,
          summary: true,
          layer: true,
          updatedAt: true,
        },
      })
    }),

  bootstrapFromModel: protectedProcedure
    .input(z.object({ requirementId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const requirement = await prisma.requirement.findUnique({
        where: { id: input.requirementId },
        select: {
          id: true,
          model: true,
        },
      })

      if (!requirement) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Requirement not found' })
      }

      if (!requirement.model) {
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: '请先完成结构化建模后再初始化 Requirement Units' })
      }

      const drafts = deriveRequirementUnitsFromModel(requirement.model)
      const existing = await prisma.requirementUnit.findMany({
        where: { requirementId: input.requirementId },
        select: { title: true, layer: true },
      })
      const existingKeys = new Set(
        existing.map((item) => `${item.layer}::${item.title.trim().toLowerCase()}`),
      )
      const missingDrafts = drafts.filter((item) => !existingKeys.has(`${item.layer}::${item.title.trim().toLowerCase()}`))

      if (missingDrafts.length === 0) {
        return { created: 0, skipped: drafts.length }
      }

      const aggregate = await prisma.requirementUnit.aggregate({
        where: { requirementId: input.requirementId },
        _max: { sortOrder: true },
      })
      const count = await prisma.requirementUnit.count({
        where: { requirementId: input.requirementId },
      })

      await prisma.requirementUnit.createMany({
        data: missingDrafts.map((item, index) => ({
          requirementId: input.requirementId,
          unitKey: `RU-${String(count + index + 1).padStart(2, '0')}`,
          title: item.title,
          summary: item.summary,
          layer: item.layer,
          sourceType: 'model-bootstrap',
          sourceRef: item.sourceRef,
          status: 'DRAFT',
          stabilityLevel: 'S1_ROUGHLY_DEFINED',
          sortOrder: (aggregate._max.sortOrder ?? -1) + index + 1,
          createdBy: ctx.session.userId,
        })),
      })

      return {
        created: missingDrafts.length,
        skipped: drafts.length - missingDrafts.length,
      }
    }),

  updateStability: protectedProcedure
    .input(z.object({
      requirementUnitId: z.string(),
      stabilityLevel: RequirementStabilityLevelEnum,
      stabilityScore: z.number().int().min(0).max(100).nullable().optional(),
      stabilityReason: z.string().trim().max(1000).nullable().optional(),
    }))
    .mutation(async ({ input }) => {
      return prisma.requirementUnit.update({
        where: { id: input.requirementUnitId },
        data: {
          stabilityLevel: input.stabilityLevel,
          stabilityScore: input.stabilityScore ?? null,
          stabilityReason: input.stabilityReason ?? null,
        },
        select: {
          id: true,
          stabilityLevel: true,
          stabilityScore: true,
          stabilityReason: true,
          updatedAt: true,
        },
      })
    }),

  updateStatus: protectedProcedure
    .input(z.object({
      requirementUnitId: z.string(),
      status: RequirementUnitStatusEnum,
    }))
    .mutation(async ({ input }) => {
      return prisma.requirementUnit.update({
        where: { id: input.requirementUnitId },
        data: { status: input.status },
        select: {
          id: true,
          status: true,
          updatedAt: true,
        },
      })
    }),
})
