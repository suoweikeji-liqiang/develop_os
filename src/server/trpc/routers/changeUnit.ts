import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { prisma } from '@/server/db/client'
import { buildChangeImpactHints } from '@/server/requirements/change-units'
import { ChangeUnitRiskLevelEnum, ChangeUnitStatusEnum } from '@/lib/requirement-evolution'
import { createTRPCRouter, protectedProcedure } from '../init'

const CreateChangeUnitInput = z.object({
  requirementId: z.string(),
  title: z.string().trim().min(1).max(120),
  reason: z.string().trim().min(1).max(4000),
  changeScope: z.string().trim().max(2000).optional(),
  impactSummary: z.string().trim().max(2000).optional(),
  riskLevel: ChangeUnitRiskLevelEnum.default('MEDIUM'),
  requiresResignoff: z.boolean().default(false),
  affectsTests: z.boolean().default(false),
  affectsPrototype: z.boolean().default(false),
  affectsCode: z.boolean().default(false),
  requirementUnitIds: z.array(z.string()).max(30).optional(),
  issueUnitIds: z.array(z.string()).max(30).optional(),
})

const UpdateChangeUnitInput = z.object({
  changeUnitId: z.string(),
  title: z.string().trim().min(1).max(120),
  reason: z.string().trim().min(1).max(4000),
  changeScope: z.string().trim().max(2000).nullable().optional(),
  impactSummary: z.string().trim().max(2000).nullable().optional(),
  riskLevel: ChangeUnitRiskLevelEnum,
  requiresResignoff: z.boolean(),
  affectsTests: z.boolean(),
  affectsPrototype: z.boolean(),
  affectsCode: z.boolean(),
  requirementUnitIds: z.array(z.string()).max(30).optional(),
  issueUnitIds: z.array(z.string()).max(30).optional(),
})

const listSelect = {
  id: true,
  changeKey: true,
  title: true,
  reason: true,
  changeScope: true,
  impactSummary: true,
  riskLevel: true,
  requiresResignoff: true,
  affectsTests: true,
  affectsPrototype: true,
  affectsCode: true,
  sourceType: true,
  sourceRef: true,
  status: true,
  proposedBy: true,
  reviewedBy: true,
  appliedAt: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      requirementVersions: true,
      modelChangeLogs: true,
    },
  },
  requirementVersions: {
    select: {
      id: true,
      version: true,
      changeSource: true,
      createdAt: true,
    },
    orderBy: {
      version: 'desc',
    },
    take: 3,
  },
  modelChangeLogs: {
    select: {
      id: true,
      changeSource: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 3,
  },
  requirementUnits: {
    select: {
      requirementUnit: {
        select: {
          id: true,
          unitKey: true,
          title: true,
        },
      },
    },
  },
  issueUnits: {
    select: {
      issueUnit: {
        select: {
          id: true,
          title: true,
          severity: true,
          blockDev: true,
        },
      },
    },
  },
} as const

const changeUnitTransitions: Record<z.infer<typeof ChangeUnitStatusEnum>, z.infer<typeof ChangeUnitStatusEnum>[]> = {
  PROPOSED: ['UNDER_REVIEW', 'REJECTED', 'ARCHIVED'],
  UNDER_REVIEW: ['APPROVED', 'REJECTED', 'ARCHIVED'],
  APPROVED: ['APPLIED', 'REJECTED', 'ARCHIVED'],
  REJECTED: ['ARCHIVED'],
  APPLIED: ['ARCHIVED'],
  ARCHIVED: [],
}

function uniqueIds(ids: string[] | undefined) {
  if (!ids || ids.length === 0) return []
  return Array.from(new Set(ids))
}

async function ensureLinkedEntitiesBelongToRequirement(
  requirementId: string,
  requirementUnitIds: string[],
  issueUnitIds: string[],
) {
  if (requirementUnitIds.length > 0) {
    const count = await prisma.requirementUnit.count({
      where: {
        requirementId,
        id: { in: requirementUnitIds },
      },
    })

    if (count !== requirementUnitIds.length) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: '关联的 Requirement Unit 不属于当前 Requirement' })
    }
  }

  if (issueUnitIds.length > 0) {
    const count = await prisma.issueUnit.count({
      where: {
        requirementId,
        id: { in: issueUnitIds },
      },
    })

    if (count !== issueUnitIds.length) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: '关联的 Issue Unit 不属于当前 Requirement' })
    }
  }
}

function assertChangeUnitTransition(
  from: z.infer<typeof ChangeUnitStatusEnum>,
  to: z.infer<typeof ChangeUnitStatusEnum>,
) {
  if (from === to) return

  if (!changeUnitTransitions[from].includes(to)) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `不支持从 ${from} 变更到 ${to}`,
    })
  }
}

export const changeUnitRouter = createTRPCRouter({
  listByRequirement: protectedProcedure
    .input(z.object({ requirementId: z.string() }))
    .query(async ({ input }) => {
      const items = await prisma.changeUnit.findMany({
        where: { requirementId: input.requirementId },
        orderBy: [
          { status: 'asc' },
          { riskLevel: 'desc' },
          { updatedAt: 'desc' },
        ],
        select: listSelect,
      })

      return items.map((item) => ({
        ...item,
        linkedRequirementVersionCount: item._count.requirementVersions,
        linkedModelChangeLogCount: item._count.modelChangeLogs,
        latestAppliedTrace: item.requirementVersions[0]
          ? {
              kind: 'version' as const,
              label: `v${item.requirementVersions[0].version}`,
              changeSource: item.requirementVersions[0].changeSource,
              createdAt: item.requirementVersions[0].createdAt,
            }
          : item.modelChangeLogs[0]
            ? {
                kind: 'modelChangeLog' as const,
                label: item.modelChangeLogs[0].changeSource,
                changeSource: item.modelChangeLogs[0].changeSource,
                createdAt: item.modelChangeLogs[0].createdAt,
              }
            : null,
        requirementUnits: item.requirementUnits.map((link) => link.requirementUnit),
        issueUnits: item.issueUnits.map((link) => link.issueUnit),
        impactHints: buildChangeImpactHints(item),
      }))
    }),

  create: protectedProcedure
    .input(CreateChangeUnitInput)
    .mutation(async ({ input, ctx }) => {
      const requirement = await prisma.requirement.findUnique({
        where: { id: input.requirementId },
        select: { id: true },
      })

      if (!requirement) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Requirement not found' })
      }

      const requirementUnitIds = uniqueIds(input.requirementUnitIds)
      const issueUnitIds = uniqueIds(input.issueUnitIds)
      await ensureLinkedEntitiesBelongToRequirement(input.requirementId, requirementUnitIds, issueUnitIds)

      return prisma.$transaction(async (tx) => {
        const count = await tx.changeUnit.count({
          where: { requirementId: input.requirementId },
        })

        const change = await tx.changeUnit.create({
          data: {
            requirementId: input.requirementId,
            changeKey: `CHG-${String(count + 1).padStart(2, '0')}`,
            title: input.title,
            reason: input.reason,
            changeScope: input.changeScope || null,
            impactSummary: input.impactSummary || null,
            riskLevel: input.riskLevel,
            requiresResignoff: input.requiresResignoff,
            affectsTests: input.affectsTests,
            affectsPrototype: input.affectsPrototype,
            affectsCode: input.affectsCode,
            sourceType: issueUnitIds.length > 0 ? 'issue' : 'manual',
            sourceRef: issueUnitIds.length > 0 ? issueUnitIds[0] : null,
            proposedBy: ctx.session.userId,
          },
        })

        if (requirementUnitIds.length > 0) {
          await tx.changeUnitRequirementUnit.createMany({
            data: requirementUnitIds.map((requirementUnitId) => ({
              changeUnitId: change.id,
              requirementUnitId,
            })),
          })
        }

        if (issueUnitIds.length > 0) {
          await tx.changeUnitIssueUnit.createMany({
            data: issueUnitIds.map((issueUnitId) => ({
              changeUnitId: change.id,
              issueUnitId,
            })),
          })
        }

        const created = await tx.changeUnit.findUniqueOrThrow({
          where: { id: change.id },
          select: listSelect,
        })

        return {
          ...created,
          linkedRequirementVersionCount: created._count.requirementVersions,
          linkedModelChangeLogCount: created._count.modelChangeLogs,
          latestAppliedTrace: null,
          requirementUnits: created.requirementUnits.map((link) => link.requirementUnit),
          issueUnits: created.issueUnits.map((link) => link.issueUnit),
          impactHints: buildChangeImpactHints(created),
        }
      })
    }),

  update: protectedProcedure
    .input(UpdateChangeUnitInput)
    .mutation(async ({ input }) => {
      const existing = await prisma.changeUnit.findUnique({
        where: { id: input.changeUnitId },
        select: {
          id: true,
          requirementId: true,
        },
      })

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Change unit not found' })
      }

      const requirementUnitIds = uniqueIds(input.requirementUnitIds)
      const issueUnitIds = uniqueIds(input.issueUnitIds)
      await ensureLinkedEntitiesBelongToRequirement(existing.requirementId, requirementUnitIds, issueUnitIds)

      return prisma.$transaction(async (tx) => {
        await tx.changeUnit.update({
          where: { id: input.changeUnitId },
          data: {
            title: input.title,
            reason: input.reason,
            changeScope: input.changeScope ?? null,
            impactSummary: input.impactSummary ?? null,
            riskLevel: input.riskLevel,
            requiresResignoff: input.requiresResignoff,
            affectsTests: input.affectsTests,
            affectsPrototype: input.affectsPrototype,
            affectsCode: input.affectsCode,
          },
        })

        await tx.changeUnitRequirementUnit.deleteMany({
          where: { changeUnitId: input.changeUnitId },
        })
        await tx.changeUnitIssueUnit.deleteMany({
          where: { changeUnitId: input.changeUnitId },
        })

        if (requirementUnitIds.length > 0) {
          await tx.changeUnitRequirementUnit.createMany({
            data: requirementUnitIds.map((requirementUnitId) => ({
              changeUnitId: input.changeUnitId,
              requirementUnitId,
            })),
          })
        }

        if (issueUnitIds.length > 0) {
          await tx.changeUnitIssueUnit.createMany({
            data: issueUnitIds.map((issueUnitId) => ({
              changeUnitId: input.changeUnitId,
              issueUnitId,
            })),
          })
        }

        const updated = await tx.changeUnit.findUniqueOrThrow({
          where: { id: input.changeUnitId },
          select: listSelect,
        })

        return {
          ...updated,
          linkedRequirementVersionCount: updated._count.requirementVersions,
          linkedModelChangeLogCount: updated._count.modelChangeLogs,
          latestAppliedTrace: updated.requirementVersions[0]
            ? {
                kind: 'version' as const,
                label: `v${updated.requirementVersions[0].version}`,
                changeSource: updated.requirementVersions[0].changeSource,
                createdAt: updated.requirementVersions[0].createdAt,
              }
            : updated.modelChangeLogs[0]
              ? {
                  kind: 'modelChangeLog' as const,
                  label: updated.modelChangeLogs[0].changeSource,
                  changeSource: updated.modelChangeLogs[0].changeSource,
                  createdAt: updated.modelChangeLogs[0].createdAt,
                }
              : null,
          requirementUnits: updated.requirementUnits.map((link) => link.requirementUnit),
          issueUnits: updated.issueUnits.map((link) => link.issueUnit),
          impactHints: buildChangeImpactHints(updated),
        }
      })
    }),

  updateStatus: protectedProcedure
    .input(z.object({
      changeUnitId: z.string(),
      status: ChangeUnitStatusEnum,
    }))
    .mutation(async ({ input, ctx }) => {
      const existing = await prisma.changeUnit.findUnique({
        where: { id: input.changeUnitId },
        select: {
          id: true,
          status: true,
          appliedAt: true,
        },
      })

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Change unit not found' })
      }

      assertChangeUnitTransition(existing.status, input.status)

      return prisma.changeUnit.update({
        where: { id: input.changeUnitId },
        data: {
          status: input.status,
          reviewedBy: input.status === 'UNDER_REVIEW' || input.status === 'APPROVED' || input.status === 'REJECTED'
            ? ctx.session.userId
            : undefined,
          appliedAt: input.status === 'APPLIED'
            ? existing.appliedAt ?? new Date()
            : existing.appliedAt,
        },
        select: {
          id: true,
          status: true,
          appliedAt: true,
          updatedAt: true,
        },
      })
    }),
})
