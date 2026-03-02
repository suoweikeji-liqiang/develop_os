import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { createTRPCRouter, protectedProcedure } from '../init'
import { prisma } from '@/server/db/client'

export const knowledgeDocumentRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    return prisma.knowledgeDocument.findMany({
      where: { uploadedBy: ctx.session.userId },
      orderBy: { createdAt: 'desc' },
    })
  }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const document = await prisma.knowledgeDocument.findUnique({
        where: { id: input.id },
      })

      if (!document || document.uploadedBy !== ctx.session.userId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Document not found' })
      }

      await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`
          DELETE FROM "KnowledgeChunk"
          WHERE "sourceType" = 'document' AND "sourceId" = ${input.id}
        `

        await tx.knowledgeDocument.delete({
          where: { id: input.id },
        })
      })

      return { success: true }
    }),

  getStatus: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const document = await prisma.knowledgeDocument.findUnique({
        where: { id: input.id },
        select: {
          id: true,
          status: true,
          chunkCount: true,
          uploadedBy: true,
        },
      })

      if (!document || document.uploadedBy !== ctx.session.userId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Document not found' })
      }

      return {
        id: document.id,
        status: document.status,
        chunkCount: document.chunkCount,
      }
    }),
})
