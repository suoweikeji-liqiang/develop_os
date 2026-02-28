import { z } from 'zod'
import { createTRPCRouter, adminProcedure } from '../init'
import { prisma } from '@/server/db/client'
import { createInvite } from '@/server/auth/invite'
import { Role } from '@/generated/prisma/client'

const RoleEnum = z.enum(['PRODUCT', 'DEV', 'TEST', 'UI', 'EXTERNAL'])

export const userRouter = createTRPCRouter({
  list: adminProcedure.query(async () => {
    return prisma.user.findMany({ include: { roles: true } })
  }),

  assignRole: adminProcedure
    .input(z.object({ userId: z.string(), role: RoleEnum }))
    .mutation(async ({ input }) => {
      return prisma.userRole.create({
        data: { userId: input.userId, role: input.role as Role },
      })
    }),

  removeRole: adminProcedure
    .input(z.object({ userId: z.string(), role: RoleEnum }))
    .mutation(async ({ input }) => {
      return prisma.userRole.delete({
        where: { userId_role: { userId: input.userId, role: input.role as Role } },
      })
    }),

  sendInvite: adminProcedure
    .input(z.object({ email: z.string().email(), roles: z.array(RoleEnum) }))
    .mutation(async ({ input, ctx }) => {
      const token = await createInvite(input.email, input.roles as Role[], ctx.session.userId)
      return { token }
    }),
})
