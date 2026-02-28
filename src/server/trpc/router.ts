import { createTRPCRouter } from './init'
import { authRouter } from './routers/auth'
import { userRouter } from './routers/user'
import { requirementRouter } from './routers/requirement'

export const appRouter = createTRPCRouter({
  auth: authRouter,
  user: userRouter,
  requirement: requirementRouter,
})

export type AppRouter = typeof appRouter
