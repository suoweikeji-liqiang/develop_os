import { z } from 'zod'
import { createTRPCRouter, protectedProcedure } from '../init'
import { prisma } from '@/server/db/client'
import { eventBus } from '@/server/events/bus'
import { embedConversationMessage } from '@/server/ai/rag/history'

export const conversationRouter = createTRPCRouter({
  getMessages: protectedProcedure
    .input(
      z.object({
        requirementId: z.string(),
        cursor: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      const messages = await prisma.conversationMessage.findMany({
        where: { requirementId: input.requirementId },
        orderBy: { createdAt: 'desc' },
        take: 21,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        skip: input.cursor ? 1 : 0,
      })

      return {
        messages: messages.slice(0, 20).reverse(),
        hasMore: messages.length === 21,
        nextCursor: messages.length === 21 ? messages[20].id : null,
      }
    }),

  saveMessage: protectedProcedure
    .input(
      z.object({
        requirementId: z.string(),
        role: z.enum(['user', 'assistant']),
        content: z.unknown(),
      }),
    )
    .mutation(async ({ input }) => {
      const message = await prisma.conversationMessage.create({
        data: {
          requirementId: input.requirementId,
          role: input.role,
          content: input.content as object,
        },
      })

      eventBus.emit('conversation.message.saved', {
        requirementId: input.requirementId,
      })

      if (message.role === 'assistant') {
        void embedConversationMessage({
          id: message.id,
          requirementId: message.requirementId,
          role: message.role,
          content: message.content,
        }).catch((err) => {
          console.error('[history] embed failed:', err)
        })
      }

      return message
    }),
})
