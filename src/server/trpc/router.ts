import { createTRPCRouter } from './init'
import { authRouter } from './routers/auth'
import { userRouter } from './routers/user'

export const appRouter = createTRPCRouter({
  auth: authRouter,
  user: userRouter,
})

export type AppRouter = typeof appRouter
