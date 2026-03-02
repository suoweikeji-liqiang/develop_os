import { createTRPCRouter } from './init'
import { authRouter } from './routers/auth'
import { userRouter } from './routers/user'
import { requirementRouter } from './routers/requirement'
import { conversationRouter } from './routers/conversation'
import { versionRouter } from './routers/version'
import { signoffRouter } from './routers/signoff'
import { commentRouter } from './routers/comment'

export const appRouter = createTRPCRouter({
  auth: authRouter,
  user: userRouter,
  requirement: requirementRouter,
  conversation: conversationRouter,
  version: versionRouter,
  signoff: signoffRouter,
  comment: commentRouter,
})

export type AppRouter = typeof appRouter
