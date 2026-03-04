import { createTRPCRouter } from './init'
import { authRouter } from './routers/auth'
import { userRouter } from './routers/user'
import { requirementRouter } from './routers/requirement'
import { conversationRouter } from './routers/conversation'
import { versionRouter } from './routers/version'
import { signoffRouter } from './routers/signoff'
import { commentRouter } from './routers/comment'
import { notificationRouter } from './routers/notification'
import { webhookRouter } from './routers/webhook'
import { externalRouter } from './routers/external'
import { knowledgeDocumentRouter } from './routers/knowledgeDocument'
import { codeRepositoryRouter } from './routers/codeRepository'
import { conflictRouter } from './routers/conflict'
import { testCaseRouter } from './routers/testCase'
import { clarificationRouter } from './routers/clarification'

export const appRouter = createTRPCRouter({
  auth: authRouter,
  user: userRouter,
  requirement: requirementRouter,
  conversation: conversationRouter,
  version: versionRouter,
  signoff: signoffRouter,
  comment: commentRouter,
  notification: notificationRouter,
  webhookConfig: webhookRouter,
  external: externalRouter,
  knowledgeDocument: knowledgeDocumentRouter,
  codeRepository: codeRepositoryRouter,
  conflict: conflictRouter,
  testCase: testCaseRouter,
  clarification: clarificationRouter,
})

export type AppRouter = typeof appRouter
