import { z } from 'zod'
import { createTRPCRouter, protectedProcedure } from '../init'
import { prisma } from '@/server/db/client'
import { eventBus } from '@/server/events/bus'

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
