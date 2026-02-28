import 'server-only'
import { initTRPC, TRPCError } from '@trpc/server'
import { getSession } from '@/server/auth/session'

export async function createTRPCContext() {
  const session = await getSession()
  return { session }
}

type Context = Awaited<ReturnType<typeof createTRPCContext>>

const t = initTRPC.context<Context>().create()

export const createTRPCRouter = t.router
export const baseProcedure = t.procedure

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session) throw new TRPCError({ code: 'UNAUTHORIZED' })
  return next({ ctx: { session: ctx.session } })
})

export const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (!ctx.session.isAdmin) throw new TRPCError({ code: 'FORBIDDEN' })
  return next({ ctx })
})
