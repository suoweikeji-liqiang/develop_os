import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { createTRPCRouter, protectedProcedure } from '../init'
import { prisma } from '@/server/db/client'
import { eventBus } from '@/server/events/bus'

const RoleEnum = z.enum(['PRODUCT', 'DEV', 'TEST', 'UI'])

const ChecklistItemSchema = z.object({
  key: z.string(),
  label: z.string(),
  checked: z.boolean(),
})

export const signoffRouter = createTRPCRouter({
  submit: protectedProcedure
    .input(z.object({
      requirementId: z.string(),
      role: RoleEnum,
      checklist: z.array(ChecklistItemSchema).min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      // 1. User must have the role they are signing off as
      if (!ctx.session.roles.includes(input.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: `您没有 ${input.role} 角色，无法以该角色签字`,
        })
      }

      // 2. Requirement must be IN_REVIEW
      const requirement = await prisma.requirement.findUniqueOrThrow({
        where: { id: input.requirementId },
        select: { id: true, status: true },
      })

      if (requirement.status !== 'IN_REVIEW') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `需求当前状态为 ${requirement.status}，只有 IN_REVIEW 状态下才能签字`,
        })
      }

      // 3. All checklist items must be checked
      const unchecked = input.checklist.filter((item) => !item.checked)
      if (unchecked.length > 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `请完成所有清单项目后再签字 (未完成: ${unchecked.map((i) => i.label).join(', ')})`,
        })
      }

      // Upsert the sign-off (idempotent)
      await prisma.reviewSignoff.upsert({
        where: {
          requirementId_role: {
            requirementId: input.requirementId,
            role: input.role,
          },
        },
        create: {
          requirementId: input.requirementId,
          role: input.role,
          userId: ctx.session.userId,
          checklist: input.checklist,
        },
        update: {
          userId: ctx.session.userId,
          checklist: input.checklist,
          signedAt: new Date(),
        },
      })

      eventBus.emit('requirement.signoff.submitted', {
        requirementId: input.requirementId,
        role: input.role,
        userId: ctx.session.userId,
      })

      return { success: true }
    }),

  list: protectedProcedure
    .input(z.object({ requirementId: z.string() }))
    .query(async ({ input }) => {
      return prisma.reviewSignoff.findMany({
        where: { requirementId: input.requirementId },
        include: { user: { select: { name: true } } },
        orderBy: { signedAt: 'asc' },
      })
    }),
})
