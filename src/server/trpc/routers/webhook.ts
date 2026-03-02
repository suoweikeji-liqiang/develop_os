import { z } from 'zod'
import { createTRPCRouter, protectedProcedure } from '../init'
import { prisma } from '@/server/db/client'

export const webhookRouter = createTRPCRouter({
  upsert: protectedProcedure
    .input(z.object({ url: z.string().url(), secret: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      return prisma.webhookConfig.upsert({
        where: { userId: ctx.session.userId },
        create: { userId: ctx.session.userId, url: input.url, secret: input.secret },
        update: { url: input.url, secret: input.secret },
      })
    }),

  get: protectedProcedure.query(async ({ ctx }) => {
    return prisma.webhookConfig.findUnique({
      where: { userId: ctx.session.userId },
    })
  }),
})
