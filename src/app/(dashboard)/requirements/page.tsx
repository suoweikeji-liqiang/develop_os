import Link from 'next/link'
import { verifySession } from '@/lib/dal'
import { prisma } from '@/server/db/client'
import { RequirementsListClient } from './requirements-list-client'

export const dynamic = 'force-dynamic'

export default async function RequirementsPage() {
  await verifySession()

  const requirements = await prisma.requirement.findMany({
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      title: true,
      rawInput: true,
      status: true,
      tags: true,
      createdBy: true,
      createdAt: true,
      updatedAt: true,
      version: true,
    },
  })

  const serialized = requirements.map((req) => ({
    ...req,
    createdAt: req.createdAt.toISOString(),
    updatedAt: req.updatedAt.toISOString(),
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">需求列表</h1>
        <Link
          href="/requirements/new"
          className="rounded bg-black px-4 py-2 text-sm text-white hover:opacity-80"
        >
          新建需求
        </Link>
      </div>

      <RequirementsListClient initialRequirements={serialized} />
    </div>
  )
}
