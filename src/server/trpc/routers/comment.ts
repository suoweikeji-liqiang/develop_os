import { z } from 'zod'
import { createTRPCRouter, protectedProcedure } from '../init'
import { prisma } from '@/server/db/client'
import { eventBus } from '@/server/events/bus'
import { sendMentionEmail } from '@/lib/email/send-mention-email'
import { deliverWebhook } from '@/lib/webhooks/deliver'

function extractMentionIds(content: string): string[] {
  const regex = /@\[([^\]]+)\]\(([^)]+)\)/g
  const ids: string[] = []
  let match
  while ((match = regex.exec(content)) !== null) {
    ids.push(match[2])
  }
  return ids
}

export const commentRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({
      requirementId: z.string(),
      content: z.string().min(1).max(5000),
    }))
    .mutation(async ({ input, ctx }) => {
      const mentionedUserIds = extractMentionIds(input.content)

      const comment = await prisma.$transaction(async (tx) => {
        const c = await tx.comment.create({
          data: {
            requirementId: input.requirementId,
            authorId: ctx.session.userId,
            content: input.content,
          },
        })

        const uniqueMentionIds = [...new Set(mentionedUserIds)].filter(
          (id) => id !== ctx.session.userId
        )

        if (uniqueMentionIds.length > 0) {
          await tx.mention.createMany({
            data: uniqueMentionIds.map((userId) => ({
              commentId: c.id,
              userId,
            })),
          })

          await tx.notification.createMany({
            data: uniqueMentionIds.map((userId) => ({
              userId,
              type: 'MENTION' as const,
              requirementId: input.requirementId,
              commentId: c.id,
            })),
          })
        }

        return c
      })

      eventBus.emit('comment.created', {
        requirementId: input.requirementId,
        commentId: comment.id,
        authorId: ctx.session.userId,
        mentionedUserIds,
      })

      for (const userId of [...new Set(mentionedUserIds)]) {
        if (userId !== ctx.session.userId) {
          eventBus.emit('notification.created', {
            userId,
            type: 'MENTION',
            requirementId: input.requirementId,
            commentId: comment.id,
          })
        }
      }

      // Fire-and-forget email + webhook for mentioned users
      void (async () => {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
        const requirementUrl = `${baseUrl}/requirements/${input.requirementId}`
        const req = await prisma.requirement.findUnique({
          where: { id: input.requirementId },
          select: { title: true },
        })
        const title = req?.title ?? input.requirementId

        for (const uid of [...new Set(mentionedUserIds)]) {
          if (uid === ctx.session.userId) continue
          const mentionedUser = await prisma.user.findUnique({
            where: { id: uid },
            select: { email: true, webhookConfig: true },
          })
          if (!mentionedUser) continue

          void sendMentionEmail({
            to: mentionedUser.email,
            mentionedBy: ctx.session.user.name,
            requirementTitle: title,
            commentPreview: input.content,
            requirementUrl,
          })

          if (mentionedUser.webhookConfig) {
            void deliverWebhook(mentionedUser.webhookConfig.url, {
              event: 'mention',
              requirementId: input.requirementId,
              commentId: comment.id,
              mentionedBy: ctx.session.user.name,
            })
          }
        }
      })()

      return comment
    }),

  list: protectedProcedure
    .input(z.object({ requirementId: z.string() }))
    .query(async ({ input }) => {
      return prisma.comment.findMany({
        where: { requirementId: input.requirementId },
        orderBy: { createdAt: 'asc' },
        include: {
          author: { select: { id: true, name: true } },
          mentions: { include: { user: { select: { id: true, name: true } } } },
        },
      })
    }),

  delete: protectedProcedure
    .input(z.object({ commentId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const comment = await prisma.comment.findUniqueOrThrow({
        where: { id: input.commentId },
        select: { authorId: true },
      })
      if (comment.authorId !== ctx.session.userId && !ctx.session.isAdmin) {
        throw new Error('无权限删除该评论')
      }
      await prisma.comment.delete({ where: { id: input.commentId } })
      return { success: true }
    }),
})
