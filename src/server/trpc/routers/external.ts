import { z } from 'zod'
import { createTRPCRouter, baseProcedure } from '../init' // baseProcedure: intentionally unauthenticated
import { prisma } from '@/server/db/client'
import { eventBus } from '@/server/events/bus'
import { ExternalSubmitSchema } from '@/lib/schemas/external'

export const externalRouter = createTRPCRouter({
  submit: baseProcedure
    .input(ExternalSubmitSchema)
    .mutation(async ({ input }) => {
      const token = crypto.randomUUID()

      const result = await prisma.$transaction(async (tx) => {
        const requirement = await tx.requirement.create({
          data: {
            title: input.title,
            rawInput: input.description,
            createdBy: 'external',
          },
        })

        const submission = await tx.externalSubmission.create({
          data: {
            token,
            requirementId: requirement.id,
            submitterName: input.submitterName,
            submitterContact: input.submitterContact ?? null,
          },
        })

        return { requirement, submission }
      })

      eventBus.emit('requirement.created', {
        requirementId: result.requirement.id,
        createdBy: 'external',
      })

      // Fire-and-forget confirmation email if contact provided and RESEND_API_KEY set
      if (input.submitterContact) {
        const statusUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/submit/status/${token}`
        void (async () => {
          try {
            const { Resend } = await import('resend')
            const resend = new Resend(process.env.RESEND_API_KEY)
            await resend.emails.send({
              from: process.env.EMAIL_FROM ?? 'onboarding@resend.dev',
              to: input.submitterContact!,
              subject: `需求已提交: ${input.title}`,
              text: `您的需求已提交成功。\n\n查看进度: ${statusUrl}\n\n请保存此链接以便跟踪处理状态。`,
            })
          } catch {
            console.log(`[external.submit] confirmation email skipped (no RESEND_API_KEY or send failed). Status URL: ${statusUrl}`)
          }
        })()
      }

      return { token, requirementId: result.requirement.id }
    }),

  status: baseProcedure
    .input(z.object({ token: z.string().min(1) }))
    .query(async ({ input }) => {
      const submission = await prisma.externalSubmission.findUnique({
        where: { token: input.token },
        include: {
          requirement: {
            select: { id: true, title: true, status: true, updatedAt: true },
          },
        },
      })

      if (!submission) return null

      return {
        title: submission.requirement.title,
        status: submission.requirement.status,
        updatedAt: submission.requirement.updatedAt.toISOString(),
        submitterName: submission.submitterName,
      }
    }),
})
