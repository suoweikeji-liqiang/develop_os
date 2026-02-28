import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { getSession } from '@/server/auth/session'

export const verifySession = cache(async () => {
  const session = await getSession()
  if (!session) redirect('/login')
  return { userId: session.userId, roles: session.roles, isAdmin: session.isAdmin }
})
