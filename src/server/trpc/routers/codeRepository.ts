import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { AddCodeRepositoryInputSchema } from '@/lib/schemas/knowledge'
import { prisma } from '@/server/db/client'
import { createTRPCRouter, protectedProcedure } from '../init'
import { decryptToken, encryptToken } from '@/server/ai/rag/crypto'
import { fetchAndEmbedRepository } from '@/server/ai/rag/github'

export const codeRepositoryRouter = createTRPCRouter({
  add: protectedProcedure
    .input(AddCodeRepositoryInputSchema)
    .mutation(async ({ ctx, input }) => {
      const encryptedToken = encryptToken(input.githubToken)

      const created = await prisma.codeRepository.create({
        data: {
          owner: input.owner,
          repo: input.repo,
          githubTokenEncrypted: encryptedToken,
          addedBy: ctx.session.userId,
        },
      })

      void fetchAndEmbedRepository(
        created.id,
        input.owner,
        input.repo,
        input.githubToken,
      ).catch((error) => {
        console.error('[codeRepository.add] background sync failed:', error)
      })

      return {
        id: created.id,
        owner: created.owner,
        repo: created.repo,
        lastSyncedAt: created.lastSyncedAt,
      }
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    return prisma.codeRepository.findMany({
      where: { addedBy: ctx.session.userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        owner: true,
        repo: true,
        lastSyncedAt: true,
        createdAt: true,
      },
    })
  }),

  sync: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const repository = await prisma.codeRepository.findUnique({
        where: { id: input.id },
      })

      if (!repository || repository.addedBy !== ctx.session.userId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Repository not found' })
      }

      const githubToken = decryptToken(repository.githubTokenEncrypted)
      void fetchAndEmbedRepository(
        repository.id,
        repository.owner,
        repository.repo,
        githubToken,
      ).catch((error) => {
        console.error('[codeRepository.sync] background sync failed:', error)
      })

      return { syncing: true }
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const repository = await prisma.codeRepository.findUnique({
        where: { id: input.id },
      })

      if (!repository || repository.addedBy !== ctx.session.userId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Repository not found' })
      }

      await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`
          DELETE FROM "KnowledgeChunk"
          WHERE "sourceType" = 'code' AND "sourceId" = ${input.id}
        `

        await tx.codeRepository.delete({
          where: { id: input.id },
        })
      })

      return { success: true }
    }),
})
