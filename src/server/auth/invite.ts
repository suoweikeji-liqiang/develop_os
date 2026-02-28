import 'server-only'
import crypto from 'crypto'
import { prisma } from '@/server/db/client'
import { Role } from '@/generated/prisma/client'

export async function createInvite(email: string, roles: Role[], invitedBy: string) {
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000)

  await prisma.invite.create({
    data: { email, roles, token, invitedBy, expiresAt },
  })

  console.log(`[DEV] Invite URL: /invite/${token}`)
  return token
}

export async function validateInvite(token: string) {
  const invite = await prisma.invite.findUnique({ where: { token } })
  if (!invite) return null
  if (invite.expiresAt < new Date()) return null
  if (invite.usedAt) return null
  return invite
}

export async function markInviteUsed(inviteId: string) {
  await prisma.invite.update({
    where: { id: inviteId },
    data: { usedAt: new Date() },
  })
}
