import { z } from 'zod'
import { createTRPCRouter, adminProcedure } from '../init'
import { prisma } from '@/server/db/client'
import { createInvite } from '@/server/auth/invite'
import { Role } from '@/generated/prisma/client'
import { eventBus } from '@/server/events/bus'

const RoleEnum = z.enum(['PRODUCT', 'DEV', 'TEST', 'UI', 'EXTERNAL'])

export const userRouter = createTRPCRouter({
  list: adminProcedure.query(async () => {
    return prisma.user.findMany({ include: { roles: true } })
  }),

  assignRole: adminProcedure
    .input(z.object({ userId: z.string(), role: RoleEnum }))
    .mutation(async ({ input, ctx }) => {
      const result = await prisma.userRole.create({
        data: { userId: input.userId, role: input.role as Role },
      })
      eventBus.emit('user.role.assigned', { userId: input.userId, role: input.role, assignedBy: ctx.session.userId })
      return result
    }),

  removeRole: adminProcedure
    .input(z.object({ userId: z.string(), role: RoleEnum }))
    .mutation(async ({ input, ctx }) => {
      const result = await prisma.userRole.delete({
        where: { userId_role: { userId: input.userId, role: input.role as Role } },
      })
      eventBus.emit('user.role.removed', { userId: input.userId, role: input.role, removedBy: ctx.session.userId })
      return result
    }),

  sendInvite: adminProcedure
    .input(z.object({ email: z.string().email(), roles: z.array(RoleEnum) }))
    .mutation(async ({ input, ctx }) => {
      const token = await createInvite(input.email, input.roles as Role[], ctx.session.userId)
      eventBus.emit('user.invited', { inviteId: token, email: input.email, roles: input.roles })
      return { token }
    }),
})
