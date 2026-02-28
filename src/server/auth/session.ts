import 'server-only'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { prisma } from '@/server/db/client'

const secretKey = new TextEncoder().encode(process.env.SESSION_SECRET)

export async function createSession(userId: string) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  const session = await prisma.session.create({
    data: { userId, expiresAt },
  })

  const token = await new SignJWT({ sessionId: session.id })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(secretKey)

  const cookieStore = await cookies()
  cookieStore.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  })
}

export async function getSession() {
  const cookieStore = await cookies()
  const cookie = cookieStore.get('session')?.value
  if (!cookie) return null

  try {
    const { payload } = await jwtVerify(cookie, secretKey)
    const session = await prisma.session.findUnique({
      where: { id: payload.sessionId as string },
      include: { user: { include: { roles: true } } },
    })

    if (!session || session.expiresAt < new Date()) return null

    return {
      userId: session.userId,
      user: session.user,
      roles: session.user.roles.map((r) => r.role),
      isAdmin: session.user.isAdmin,
    }
  } catch {
    return null
  }
}

export async function deleteSession() {
  const cookieStore = await cookies()
  const cookie = cookieStore.get('session')?.value
  if (!cookie) return

  try {
    const { payload } = await jwtVerify(cookie, secretKey)
    await prisma.session.delete({
      where: { id: payload.sessionId as string },
    })
  } catch {
    // Session may already be deleted
  }

  cookieStore.delete('session')
}
