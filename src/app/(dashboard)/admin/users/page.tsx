import { verifySession } from '@/lib/dal'
import { redirect } from 'next/navigation'
import { prisma } from '@/server/db/client'
import { AdminUsersClient } from './client'

export const dynamic = 'force-dynamic'

export default async function AdminUsersPage() {
  const session = await verifySession()
  if (!session.isAdmin) redirect('/')

  const users = await prisma.user.findMany({
    include: { roles: true },
    orderBy: { createdAt: 'asc' },
  })

  return <AdminUsersClient users={users} />
}
