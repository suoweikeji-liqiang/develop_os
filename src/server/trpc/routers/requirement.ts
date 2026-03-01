import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { createTRPCRouter, protectedProcedure } from '../init'
import { prisma } from '@/server/db/client'
import { FiveLayerModelSchema, CreateRequirementSchema } from '@/lib/schemas/requirement'
import { eventBus } from '@/server/events/bus'
import { assertTransition, RequirementStatusEnum } from '@/lib/workflow/status-machine'
import type { RequirementStatus } from '@/lib/workflow/status-machine'

const RoleEnum = z.enum(['PRODUCT', 'DEV', 'TEST', 'UI', 'EXTERNAL'])

const SearchInputSchema = z.object({
  query: z.string().optional(),
  status: RequirementStatusEnum.optional(),
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
    }))
    .mutation(async ({ input, ctx }) => {
      // Capture status before the transaction to decide if sign-offs should be invalidated
      const reqStatus = await prisma.requirement.findUniqueOrThrow({
        where: { id: input.id },
        select: { status: true },
      })

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

      // Gate: all four reviewer roles must have signed off before entering CONSENSUS
      const REQUIRED_ROLES = ['PRODUCT', 'DEV', 'TEST', 'UI'] as const

      if (current.status === 'IN_REVIEW' && input.to === 'CONSENSUS') {
        const signoffs = await prisma.reviewSignoff.findMany({
          where: { requirementId: input.id },
          select: { role: true },
        })
        const signedRoles = new Set(signoffs.map((s) => s.role))
        const missing = REQUIRED_ROLES.filter((r) => !signedRoles.has(r))
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

      if (filters.tags && filters.tags.length > 0) {
        conditions.push({ tags: { hasSome: filters.tags } })
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

      return prisma.requirement.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        select: searchSelect,
      })
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
