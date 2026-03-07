import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { createTRPCRouter, protectedProcedure } from '../init'
import { prisma } from '@/server/db/client'
import { IssueUnitSeverityEnum, IssueUnitStatusEnum } from '@/lib/requirement-evolution'
import {
  buildClarificationConclusionMeta,
  buildClarificationQueueStatusMeta,
  buildIssuePriorityContext,
  buildIssuePriorityMeta,
  buildIssueQueueLifecycleMeta,
  compareIssueQueueItems,
  getClarificationCategoryLabel,
  getIssueQueueSourceLabel,
  getIssueQueueSourceStatusLabel,
  isActiveIssueStatus,
  IssueUnitTypeEnum,
  mapConflictStatusToIssueStatus,
  normalizeIssueType,
} from '@/lib/issue-queue'

const CreateIssueUnitInput = z.object({
  requirementId: z.string(),
  primaryRequirementUnitId: z.string().optional(),
  type: IssueUnitTypeEnum,
  severity: IssueUnitSeverityEnum.default('MEDIUM'),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(2000),
  blockDev: z.boolean().default(false),
  suggestedResolution: z.string().trim().max(1000).optional(),
})

const UpdateIssueUnitInput = z.object({
  issueUnitId: z.string(),
  primaryRequirementUnitId: z.string().nullable().optional(),
  type: IssueUnitTypeEnum,
  severity: IssueUnitSeverityEnum,
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(2000),
  blockDev: z.boolean(),
  suggestedResolution: z.string().trim().max(1000).nullable().optional(),
})

export const issueUnitRouter = createTRPCRouter({
  listByRequirement: protectedProcedure
    .input(z.object({ requirementId: z.string() }))
    .query(async ({ input }) => {
      const [issueUnits, conflicts] = await Promise.all([
        prisma.issueUnit.findMany({
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
                layer: true,
                stabilityLevel: true,
              },
            },
          },
        }),
        prisma.requirementConflict.findMany({
          where: { requirementId: input.requirementId },
          orderBy: [
            { status: 'asc' },
            { severity: 'desc' },
            { updatedAt: 'desc' },
          ],
          select: {
            id: true,
            severity: true,
            status: true,
            title: true,
            summary: true,
            recommendedAction: true,
            updatedAt: true,
          },
        }),
      ])

      const clarificationQuestions = await prisma.clarificationQuestion.findMany({
        where: {
          id: {
            in: issueUnits
              .filter((item) => item.sourceType === 'clarification' && item.sourceRef)
              .map((item) => item.sourceRef as string),
          },
        },
        select: {
          id: true,
          category: true,
          status: true,
        },
      })

      const clarificationById = new Map(
        clarificationQuestions.map((item) => [item.id, item]),
      )

      const queue = [
        ...issueUnits.map((item) => {
          const clarification = item.sourceType === 'clarification' && item.sourceRef
            ? clarificationById.get(item.sourceRef)
            : null
          const clarificationQueueStatus = clarification
            ? buildClarificationQueueStatusMeta({
                category: clarification.category,
                clarificationStatus: clarification.status,
                issueStatus: item.status,
              })
            : null

          return {
            id: item.id,
            entityId: item.id,
            queueKind: 'issue' as const,
            type: item.type,
            severity: item.severity,
            title: item.title,
            description: item.description,
            status: item.status,
            blockDev: item.blockDev,
            sourceType: item.sourceType,
            sourceRef: item.sourceRef,
            sourceLabel: getIssueQueueSourceLabel(item.sourceType, 'issue'),
            sourceStatus: clarification?.status ?? null,
            sourceStatusLabel: getIssueQueueSourceStatusLabel({
              queueKind: 'issue',
              sourceType: item.sourceType,
              status: clarification?.status,
            }),
            conclusionSignal: item.sourceType === 'clarification'
              ? buildClarificationConclusionMeta({
                  issueType: item.type,
                  issueStatus: item.status,
                  clarificationCategory: clarification?.category ?? null,
                  callbackNeeded: clarificationQueueStatus?.callbackNeeded ?? false,
                  primaryRequirementUnit: item.primaryRequirementUnit,
                })
              : null,
            sourceCategory: clarification?.category ?? null,
            sourceCategoryLabel: getClarificationCategoryLabel(clarification?.category),
            lifecycle: buildIssueQueueLifecycleMeta({
              queueKind: 'issue',
              sourceType: item.sourceType,
              issueStatus: item.status,
              blockDev: item.blockDev,
              sourceStatus: clarification?.status ?? null,
              sourceCategory: clarification?.category ?? null,
            }),
            suggestedResolution: item.suggestedResolution,
            ownerId: item.ownerId,
            updatedAt: item.updatedAt,
            primaryRequirementUnit: item.primaryRequirementUnit,
          }
        }),
        ...conflicts.map((item) => {
          const status = mapConflictStatusToIssueStatus(item.status)

          return {
            id: `conflict:${item.id}`,
            entityId: item.id,
            queueKind: 'conflict' as const,
            type: 'conflict',
            severity: item.severity === 'HIGH' ? 'HIGH' as const : item.severity,
            title: item.title,
            description: item.summary,
            status,
            blockDev: false,
            sourceType: 'conflict-scan',
            sourceRef: item.id,
            sourceLabel: getIssueQueueSourceLabel('conflict-scan', 'conflict'),
            sourceStatus: item.status,
            sourceStatusLabel: getIssueQueueSourceStatusLabel({
              queueKind: 'conflict',
              sourceType: 'conflict-scan',
              status: item.status,
            }),
            sourceCategory: null,
            sourceCategoryLabel: null,
            lifecycle: buildIssueQueueLifecycleMeta({
              queueKind: 'conflict',
              sourceType: 'conflict-scan',
              issueStatus: status,
              blockDev: false,
              sourceStatus: item.status,
            }),
            suggestedResolution: item.recommendedAction,
            ownerId: null,
            updatedAt: item.updatedAt,
            primaryRequirementUnit: null,
          }
        }),
      ]

      const priorityContext = buildIssuePriorityContext({
        activeItems: queue
          .filter((item) => isActiveIssueStatus(item.status))
          .map((item) => ({
            type: item.type,
            primaryRequirementUnit: item.primaryRequirementUnit,
          })),
      })

      return queue
        .map((item) => {
          const priority = buildIssuePriorityMeta({
            type: item.type,
            issueStatus: item.status,
            severity: item.severity,
            blockDev: item.blockDev,
            primaryRequirementUnit: item.primaryRequirementUnit,
            context: priorityContext,
          })

          return {
            ...item,
            priority,
            priorityScore: priority.score,
          }
        })
        .sort(compareIssueQueueItems)
    }),

  create: protectedProcedure
    .input(CreateIssueUnitInput)
    .mutation(async ({ input, ctx }) => {
      const requirement = await prisma.requirement.findUnique({
        where: { id: input.requirementId },
        select: { id: true },
      })

      if (!requirement) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Requirement not found' })
      }

      if (input.primaryRequirementUnitId) {
        const unit = await prisma.requirementUnit.findFirst({
          where: {
            id: input.primaryRequirementUnitId,
            requirementId: input.requirementId,
          },
          select: { id: true },
        })

        if (!unit) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Primary requirement unit is invalid' })
        }
      }

      return prisma.issueUnit.create({
        data: {
          requirementId: input.requirementId,
          primaryRequirementUnitId: input.primaryRequirementUnitId,
          type: normalizeIssueType(input.type),
          severity: input.severity,
          title: input.title,
          description: input.description,
          blockDev: input.blockDev,
          sourceType: 'manual',
          suggestedResolution: input.suggestedResolution || null,
          createdBy: ctx.session.userId,
        },
      })
    }),

  update: protectedProcedure
    .input(UpdateIssueUnitInput)
    .mutation(async ({ input }) => {
      const existing = await prisma.issueUnit.findUnique({
        where: { id: input.issueUnitId },
        select: {
          id: true,
          requirementId: true,
        },
      })

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Issue unit not found' })
      }

      if (input.primaryRequirementUnitId) {
        const unit = await prisma.requirementUnit.findFirst({
          where: {
            id: input.primaryRequirementUnitId,
            requirementId: existing.requirementId,
          },
          select: { id: true },
        })

        if (!unit) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Primary requirement unit is invalid' })
        }
      }

      return prisma.issueUnit.update({
        where: { id: input.issueUnitId },
        data: {
          primaryRequirementUnitId: input.primaryRequirementUnitId ?? null,
          type: normalizeIssueType(input.type),
          severity: input.severity,
          title: input.title,
          description: input.description,
          blockDev: input.blockDev,
          suggestedResolution: input.suggestedResolution ?? null,
        },
        select: {
          id: true,
          title: true,
          description: true,
          type: true,
          severity: true,
          blockDev: true,
          suggestedResolution: true,
          primaryRequirementUnitId: true,
          updatedAt: true,
        },
      })
    }),

  updateStatus: protectedProcedure
    .input(z.object({
      issueUnitId: z.string(),
      status: IssueUnitStatusEnum,
    }))
    .mutation(async ({ input }) => {
      return prisma.issueUnit.update({
        where: { id: input.issueUnitId },
        data: { status: input.status },
        select: {
          id: true,
          status: true,
          updatedAt: true,
        },
      })
    }),
})
