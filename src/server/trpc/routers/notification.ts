import { z } from 'zod'
import { createTRPCRouter, protectedProcedure } from '../init'
import { prisma } from '@/server/db/client'

export const notificationRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(20) }))
    .query(async ({ input, ctx }) => {
      return prisma.notification.findMany({
        where: { userId: ctx.session.userId },
        orderBy: { createdAt: 'desc' },
        take: input.limit,
        include: {
          requirement: { select: { id: true, title: true } },
          comment: { select: { id: true, content: true } },
        },
      })
    }),

  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    return prisma.notification.count({
      where: { userId: ctx.session.userId, read: false },
    })
  }),

  markRead: protectedProcedure
    .input(z.object({ notificationId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await prisma.notification.updateMany({
        where: { id: input.notificationId, userId: ctx.session.userId },
        data: { read: true },
      })
      return { success: true }
    }),

  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    await prisma.notification.updateMany({
      where: { userId: ctx.session.userId, read: false },
      data: { read: true },
    })
    return { success: true }
  }),
})
