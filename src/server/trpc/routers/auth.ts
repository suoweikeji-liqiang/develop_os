import { createTRPCRouter, protectedProcedure } from '../init'

export const authRouter = createTRPCRouter({
  me: protectedProcedure.query(({ ctx }) => ({
    id: ctx.session.userId,
    email: ctx.session.user.email,
    name: ctx.session.user.name,
    roles: ctx.session.roles,
    isAdmin: ctx.session.isAdmin,
  })),
})
