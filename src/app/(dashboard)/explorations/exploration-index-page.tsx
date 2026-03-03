import Link from 'next/link'
import { verifySession } from '@/lib/dal'
import { prisma } from '@/server/db/client'
import { ExplorationsListClient } from './explorations-list-client'

export type ListView = 'explorations' | 'models' | 'evolution'

interface Props {
  listView: ListView
}

export async function ExplorationIndexPage({ listView }: Props) {
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

  const headings: Record<ListView, { title: string; subtitle: string }> = {
    explorations: {
      title: 'Explorations',
      subtitle: 'Context-driven journeys, dialogue and experiment traces.',
    },
    models: {
      title: 'Models',
      subtitle: 'Reusable ModelCards focused on structural abstraction.',
    },
    evolution: {
      title: 'Evolution',
      subtitle: 'Version-oriented view of how each ModelCard evolved.',
    },
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{headings[listView].title}</h1>
          <Link
            href="/explorations/new"
            className="rounded bg-black px-4 py-2 text-sm text-white hover:opacity-80"
          >
            New Exploration
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">{headings[listView].subtitle}</p>
      </div>

      <ExplorationsListClient initialRequirements={serialized} initialView={listView} />
    </div>
  )
}
