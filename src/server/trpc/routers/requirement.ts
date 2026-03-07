import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { createTRPCRouter, protectedProcedure } from '../init'
import { prisma } from '@/server/db/client'
import { FiveLayerModelSchema, CreateRequirementSchema } from '@/lib/schemas/requirement'
import { eventBus } from '@/server/events/bus'
import { assertTransition, RequirementStatusEnum } from '@/lib/workflow/status-machine'
import type { RequirementStatus } from '@/lib/workflow/status-machine'
import { WORKFLOW_REVIEWER_ROLES, canManageRequirementWorkflow } from '@/lib/workflow/permissions'
import { scanRequirementConflicts } from '@/server/conflicts/service'
import { RequirementStabilityLevelEnum } from '@/lib/requirement-evolution'
import { attachRequirementOverviewStats } from '@/server/requirements/overview'
import {
  ACTIVE_CHANGE_STATUSES,
  buildRequirementGateHints,
  HIGH_RISK_CHANGE_LEVELS,
} from '@/server/requirements/change-units'
import {
  ACTIVE_ISSUE_UNIT_STATUSES,
  getIssueTypeLabel,
  isIssueType,
} from '@/lib/issue-queue'
import {
  buildRequirementImpactSummary,
  buildRequirementWorksurfaceGuidance,
  isRequirementStabilityAtLeast,
  TARGET_REQUIREMENT_UNIT_STABILITY_LEVEL,
} from '@/server/requirements/worksurface'
import {
  computeCompleteness,
  deriveSpecDraft,
  deriveStructuredBundle,
  renderSpecMarkdown,
} from '@/server/ai/clarification'

const RoleEnum = z.enum(['PRODUCT', 'DEV', 'TEST', 'UI', 'EXTERNAL'])

const SearchInputSchema = z.object({
  query: z.string().optional(),
  status: RequirementStatusEnum.optional(),
  stabilityLevel: RequirementStabilityLevelEnum.optional(),
  hasBlockingIssues: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  role: RoleEnum.optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
}).optional()

const searchSelect = {
  id: true,
  title: true,
  rawInput: true,
  status: true,
  stabilityLevel: true,
  tags: true,
  createdBy: true,
  createdAt: true,
  updatedAt: true,
  version: true,
} as const

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
      changeUnitId: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Capture status before the transaction to decide if sign-offs should be invalidated
      const reqStatus = await prisma.requirement.findUniqueOrThrow({
        where: { id: input.id },
        select: { status: true },
      })

      if (input.changeUnitId) {
        const change = await prisma.changeUnit.findFirst({
          where: {
            id: input.changeUnitId,
            requirementId: input.id,
          },
          select: { id: true },
        })

        if (!change) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Change Unit 不属于当前 Requirement' })
        }
      }

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
              changeUnitId: input.changeUnitId ?? null,
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

      // Invalidate stale sign-offs when model changes during review
      if (reqStatus.status === 'IN_REVIEW') {
        await prisma.reviewSignoff.deleteMany({
          where: { requirementId: input.id },
        })
        eventBus.emit('requirement.signoff.invalidated', {
          requirementId: input.id,
          reason: 'model-updated',
        })
      }

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

      void scanRequirementConflicts({
        requirementId: requirement.id,
        userId: ctx.session.userId,
      }).catch((error) => {
        console.error('[conflicts] auto-scan failed:', error)
      })

      return requirement
    }),

  structureFromRawInput: protectedProcedure
    .input(z.object({ requirementId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const requirement = await prisma.requirement.findUniqueOrThrow({
        where: { id: input.requirementId },
        select: { id: true, title: true, rawInput: true },
      })

      const latestLog = await prisma.modelChangeLog.findFirst({
        where: {
          requirementId: requirement.id,
          changeSource: 'ai-structure',
          createdAt: { gte: new Date(Date.now() - 60_000) },
        },
      })
      if (latestLog) {
        throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: '一分钟内仅允许一次结构化' })
      }

      const bundle = await deriveStructuredBundle({
        title: requirement.title,
        rawInput: requirement.rawInput,
      })

      await prisma.$transaction(async (tx) => {
        const current = await tx.requirement.findUniqueOrThrow({
          where: { id: requirement.id },
          select: { model: true, version: true, confidence: true },
        })

        if (current.model !== null) {
          await tx.requirementVersion.create({
            data: {
              requirementId: requirement.id,
              version: current.version,
              model: current.model,
              confidence: current.confidence ?? undefined,
              changeSource: 'ai-structure',
              createdBy: ctx.session.userId,
            },
          })
        }

        await tx.requirement.update({
          where: { id: requirement.id },
          data: {
            model: bundle.model,
            version: { increment: 1 },
          },
        })

        const session = await tx.clarificationSession.create({
          data: { requirementId: requirement.id },
        })

        await tx.clarificationQuestion.createMany({
          data: bundle.clarificationQuestions.map((question) => ({
            sessionId: session.id,
            category: question.category,
            questionText: question.questionText,
          })),
        })

        await tx.modelChangeLog.create({
          data: {
            requirementId: requirement.id,
            changeSource: 'ai-structure',
            patchJson: bundle,
            rationale: 'Initial structuring from raw input',
            confidence: 0.7,
            evidenceRefs: [],
          },
        })
      })

      const specMarkdown = renderSpecMarkdown(await deriveSpecDraft({
        model: bundle.model,
        assumptions: bundle.assumptions,
        decisionPoints: bundle.decisionPoints,
      }))

      await prisma.specArtifact.create({
        data: {
          requirementId: requirement.id,
          version: 1,
          format: 'markdown',
          content: specMarkdown,
        },
      })

      return {
        model: bundle.model,
        assumptions: bundle.assumptions,
        decisionPoints: bundle.decisionPoints,
        completeness: computeCompleteness(bundle.model),
      }
    }),

  generateSpec: protectedProcedure
    .input(z.object({ requirementId: z.string() }))
    .mutation(async ({ input }) => {
      const requirement = await prisma.requirement.findUniqueOrThrow({
        where: { id: input.requirementId },
      })
      if (!requirement.model) {
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: '请先完成结构化建模' })
      }

      const changeLog = await prisma.modelChangeLog.findFirst({
        where: { requirementId: requirement.id, changeSource: 'ai-structure' },
        orderBy: { createdAt: 'desc' },
      })
      const payload = (changeLog?.patchJson ?? {}) as {
        assumptions?: Array<{ type: string; content: string }>
        decisionPoints?: Array<{ title: string; selected?: string | null; options?: string[] }>
      }

      const spec = await deriveSpecDraft({
        model: requirement.model as z.infer<typeof FiveLayerModelSchema>,
        assumptions: payload.assumptions ?? [],
        decisionPoints: payload.decisionPoints ?? [],
      })
      const content = renderSpecMarkdown(spec)

      const latest = await prisma.specArtifact.findFirst({
        where: { requirementId: requirement.id },
        orderBy: { version: 'desc' },
      })

      const artifact = await prisma.specArtifact.create({
        data: {
          requirementId: requirement.id,
          version: (latest?.version ?? 0) + 1,
          format: 'markdown',
          content,
        },
      })

      return { spec: content, artifact }
    }),

  getCompleteness: protectedProcedure
    .input(z.object({ requirementId: z.string() }))
    .query(async ({ input }) => {
      const requirement = await prisma.requirement.findUniqueOrThrow({
        where: { id: input.requirementId },
        select: { model: true },
      })
      return computeCompleteness(requirement.model as z.infer<typeof FiveLayerModelSchema> | null)
    }),

  getGateHints: protectedProcedure
    .input(z.object({ requirementId: z.string() }))
    .query(async ({ input }) => {
      const [blockingIssueCount, highRiskChangeCount, resignoffChangeCount] = await Promise.all([
        prisma.issueUnit.count({
          where: {
            requirementId: input.requirementId,
            blockDev: true,
            status: { in: [...ACTIVE_ISSUE_UNIT_STATUSES] },
          },
        }),
        prisma.changeUnit.count({
          where: {
            requirementId: input.requirementId,
            status: { in: [...ACTIVE_CHANGE_STATUSES] },
            riskLevel: { in: [...HIGH_RISK_CHANGE_LEVELS] },
          },
        }),
        prisma.changeUnit.count({
          where: {
            requirementId: input.requirementId,
            status: { in: [...ACTIVE_CHANGE_STATUSES] },
            requiresResignoff: true,
          },
        }),
      ])

      return {
        blockingIssueCount,
        highRiskChangeCount,
        resignoffChangeCount,
        hints: buildRequirementGateHints({
          blockingIssueCount,
          highRiskChangeCount,
          resignoffChangeCount,
        }),
      }
    }),

  getWorksurfaceSummary: protectedProcedure
    .input(z.object({ requirementId: z.string() }))
    .query(async ({ input }) => {
      const requirement = await prisma.requirement.findUnique({
        where: { id: input.requirementId },
        select: {
          id: true,
          stabilityLevel: true,
        },
      })

      if (!requirement) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Requirement not found' })
      }

      const [units, activeIssueUnits, openConflictCount, pendingClarificationCount, highRiskChangeCount, resignoffChangeCount] = await Promise.all([
        prisma.requirementUnit.findMany({
          where: { requirementId: input.requirementId },
          select: {
            id: true,
            status: true,
            stabilityLevel: true,
          },
        }),
        prisma.issueUnit.findMany({
          where: {
            requirementId: input.requirementId,
            status: { in: [...ACTIVE_ISSUE_UNIT_STATUSES] },
          },
          select: {
            id: true,
            type: true,
            blockDev: true,
            primaryRequirementUnitId: true,
          },
        }),
        prisma.requirementConflict.count({
          where: {
            requirementId: input.requirementId,
            status: 'OPEN',
          },
        }),
        prisma.clarificationQuestion.count({
          where: {
            session: {
              is: {
                requirementId: input.requirementId,
              },
            },
            status: {
              in: ['OPEN', 'ANSWERED'],
            },
          },
        }),
        prisma.changeUnit.count({
          where: {
            requirementId: input.requirementId,
            status: { in: [...ACTIVE_CHANGE_STATUSES] },
            riskLevel: { in: [...HIGH_RISK_CHANGE_LEVELS] },
          },
        }),
        prisma.changeUnit.count({
          where: {
            requirementId: input.requirementId,
            status: { in: [...ACTIVE_CHANGE_STATUSES] },
            requiresResignoff: true,
          },
        }),
      ])

      const activeUnits = units.filter((unit) => unit.status !== 'ARCHIVED')
      const readyUnits = activeUnits.filter((unit) => unit.status === 'READY_FOR_DEV')
      const unitsBelowTarget = activeUnits.filter((unit) => !isRequirementStabilityAtLeast(unit.stabilityLevel, TARGET_REQUIREMENT_UNIT_STABILITY_LEVEL))
      const blockingIssueCount = activeIssueUnits.filter((issue) => issue.blockDev).length
      const activeIssueCount = activeIssueUnits.length + openConflictCount

      const typeCounter = new Map<string, { count: number; blockingCount: number }>()
      for (const issue of activeIssueUnits) {
        const key = issue.type
        const current = typeCounter.get(key) ?? { count: 0, blockingCount: 0 }
        typeCounter.set(key, {
          count: current.count + 1,
          blockingCount: current.blockingCount + (issue.blockDev ? 1 : 0),
        })
      }
      if (openConflictCount > 0) {
        const current = typeCounter.get('conflict') ?? { count: 0, blockingCount: 0 }
        typeCounter.set('conflict', {
          count: current.count + openConflictCount,
          blockingCount: current.blockingCount,
        })
      }

      const impactedRequirementUnitIds = new Set<string>()
      for (const issue of activeIssueUnits) {
        if (issue.primaryRequirementUnitId) {
          impactedRequirementUnitIds.add(issue.primaryRequirementUnitId)
        }
      }
      for (const unit of unitsBelowTarget) {
        impactedRequirementUnitIds.add(unit.id)
      }

      const issueBreakdown = Array.from(typeCounter.entries())
        .map(([type, stats]) => ({
          type,
          label: isIssueType(type) ? getIssueTypeLabel(type) : type,
          count: stats.count,
          blockingCount: stats.blockingCount,
        }))
        .sort((a, b) => b.count - a.count)

      return {
        counts: {
          totalUnits: units.length,
          activeUnits: activeUnits.length,
          readyUnits: readyUnits.length,
          unitsBelowTarget: unitsBelowTarget.length,
          openIssues: activeIssueCount,
          blockingIssues: blockingIssueCount,
          openConflicts: openConflictCount,
          pendingClarifications: pendingClarificationCount,
        },
        targetRequirementUnitStabilityLevel: TARGET_REQUIREMENT_UNIT_STABILITY_LEVEL,
        issueBreakdown,
        guidance: buildRequirementWorksurfaceGuidance({
          requirementStabilityLevel: requirement.stabilityLevel,
          totalUnits: units.length,
          activeUnits: activeUnits.length,
          unitsBelowTarget: unitsBelowTarget.length,
          openIssueCount: activeIssueCount,
          blockingIssueCount,
          openConflictCount,
          pendingClarificationCount,
          highRiskChangeCount,
          resignoffChangeCount,
        }),
        impactSummary: buildRequirementImpactSummary({
          affectedRequirementUnitCount: impactedRequirementUnitIds.size,
          openIssueCount: activeIssueCount,
          blockingIssueCount,
          openConflictCount,
          pendingClarificationCount,
          unitsBelowTarget: unitsBelowTarget.length,
          requirementStabilityLevel: requirement.stabilityLevel,
        }),
      }
    }),

  updateStability: protectedProcedure
    .input(z.object({
      requirementId: z.string(),
      stabilityLevel: RequirementStabilityLevelEnum,
      stabilityScore: z.number().int().min(0).max(100).nullable().optional(),
      stabilityReason: z.string().trim().max(1000).nullable().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return prisma.requirement.update({
        where: { id: input.requirementId },
        data: {
          stabilityLevel: input.stabilityLevel,
          stabilityScore: input.stabilityScore ?? null,
          stabilityReason: input.stabilityReason ?? null,
          stabilityUpdatedAt: new Date(),
          stabilityUpdatedBy: ctx.session.userId,
        },
        select: {
          id: true,
          stabilityLevel: true,
          stabilityScore: true,
          stabilityReason: true,
          stabilityUpdatedAt: true,
        },
      })
    }),

  transitionStatus: protectedProcedure
    .input(z.object({ id: z.string(), to: RequirementStatusEnum }))
    .mutation(async ({ input, ctx }) => {
      if (!canManageRequirementWorkflow({
        roles: ctx.session.roles,
        isAdmin: ctx.session.isAdmin,
      })) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: '只有评审角色或管理员可以推进需求状态',
        })
      }

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

      // Gate: all four reviewer roles must have signed off before entering CONSENSUS
      if (current.status === 'IN_REVIEW' && input.to === 'CONSENSUS') {
        const signoffs = await prisma.reviewSignoff.findMany({
          where: { requirementId: input.id },
          select: { role: true },
        })
        const signedRoles = new Set(signoffs.map((s) => s.role))
        const missing = WORKFLOW_REVIEWER_ROLES.filter((r) => !signedRoles.has(r))
        if (missing.length > 0) {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: `缺少以下角色的签字确认: ${missing.join(', ')}`,
          })
        }
      }

      const updated = await prisma.requirement.update({
        where: { id: input.id, status: current.status },
        data: { status: input.to },
      })

      // Clear sign-offs when reverting from CONSENSUS back to IN_REVIEW
      if (current.status === 'CONSENSUS' && input.to === 'IN_REVIEW') {
        await prisma.reviewSignoff.deleteMany({
          where: { requirementId: input.id },
        })
      }

      eventBus.emit('requirement.status.changed', {
        requirementId: updated.id,
        from: current.status,
        to: input.to,
        changedBy: ctx.session.userId,
      })

      // Fire-and-forget: notify sign-off contributors of status change
      void (async () => {
        const { sendStatusChangeEmail } = await import('@/lib/email/send-status-change-email')
        const { deliverWebhook } = await import('@/lib/webhooks/deliver')

        const signoffs = await prisma.reviewSignoff.findMany({
          where: { requirementId: input.id },
          include: { user: { select: { id: true, email: true, name: true, webhookConfig: true } } },
        })

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
        const requirementUrl = `${baseUrl}/requirements/${input.id}`
        const req = await prisma.requirement.findUnique({
          where: { id: input.id },
          select: { title: true },
        })
        const title = req?.title ?? input.id

        for (const signoff of signoffs) {
          if (signoff.user.id === ctx.session.userId) continue
          try {
            await prisma.notification.create({
              data: {
                userId: signoff.user.id,
                type: 'STATUS_CHANGE',
                requirementId: input.id,
              },
            })
            eventBus.emit('notification.created', {
              userId: signoff.user.id,
              type: 'STATUS_CHANGE' as const,
              requirementId: input.id,
            })
            void sendStatusChangeEmail({
              to: signoff.user.email,
              requirementTitle: title,
              fromStatus: current.status,
              toStatus: input.to,
              changedBy: ctx.session.user.name,
              requirementUrl,
            })
            if (signoff.user.webhookConfig) {
              void deliverWebhook(signoff.user.webhookConfig.url, {
                event: 'status_change',
                requirementId: input.id,
                from: current.status,
                to: input.to,
              })
            }
          } catch (error) {
            console.error('[notifications] failed to create status change notification:', error)
          }
        }
      })()

      return updated
    }),

  search: protectedProcedure
    .input(SearchInputSchema)
    .query(async ({ input }) => {
      const filters = input ?? {}
      const conditions: Record<string, unknown>[] = []

      if (filters.query) {
        conditions.push({
          OR: [
            { title: { contains: filters.query, mode: 'insensitive' } },
            { rawInput: { contains: filters.query, mode: 'insensitive' } },
          ],
        })
      }

      if (filters.status) {
        conditions.push({ status: filters.status })
      }

      if (filters.stabilityLevel) {
        conditions.push({ stabilityLevel: filters.stabilityLevel })
      }

      if (filters.tags && filters.tags.length > 0) {
        conditions.push({ tags: { hasSome: filters.tags } })
      }

      if (filters.hasBlockingIssues) {
        conditions.push({
          issueUnits: {
            some: {
              blockDev: true,
              status: { in: ['OPEN', 'TRIAGED', 'IN_PROGRESS', 'WAITING_CONFIRMATION'] },
            },
          },
        })
      }

      if (filters.role) {
        const userRoles = await prisma.userRole.findMany({
          where: { role: filters.role },
          select: { userId: true },
        })
        const userIds = userRoles.map((ur) => ur.userId)
        conditions.push({ createdBy: { in: userIds } })
      }

      if (filters.dateFrom) {
        conditions.push({ createdAt: { gte: filters.dateFrom } })
      }

      if (filters.dateTo) {
        conditions.push({ createdAt: { lte: filters.dateTo } })
      }

      const where = conditions.length > 0 ? { AND: conditions } : undefined

      const requirements = await prisma.requirement.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        select: searchSelect,
      })

      return attachRequirementOverviewStats(requirements)
    }),

  addTag: protectedProcedure
    .input(z.object({ id: z.string(), tag: z.string().min(1).max(50) }))
    .mutation(async ({ input }) => {
      return prisma.requirement.update({
        where: { id: input.id },
        data: { tags: { push: input.tag } },
      })
    }),

  removeTag: protectedProcedure
    .input(z.object({ id: z.string(), tag: z.string() }))
    .mutation(async ({ input }) => {
      const requirement = await prisma.requirement.findUniqueOrThrow({
        where: { id: input.id },
        select: { tags: true },
      })

      const updatedTags = requirement.tags.filter((t) => t !== input.tag)

      return prisma.requirement.update({
        where: { id: input.id },
        data: { tags: updatedTags },
      })
    }),
})
