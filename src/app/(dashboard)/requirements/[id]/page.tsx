import { notFound } from 'next/navigation'
import { prisma } from '@/server/db/client'
import { verifySession } from '@/lib/dal'
import { ModelTabs } from './model-tabs'
import type { FiveLayerModel } from '@/lib/schemas/requirement'

export const dynamic = 'force-dynamic'

export default async function RequirementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await verifySession()
  const { id } = await params

  const requirement = await prisma.requirement.findUnique({
    where: { id },
  })

  if (!requirement) notFound()

  const hasModel = requirement.model !== null

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{requirement.title}</h1>
        <p className="text-sm text-muted-foreground">
          状态: {requirement.status} | 版本: v{requirement.version}
        </p>
      </div>

      <ModelTabs
        requirementId={requirement.id}
        rawInput={requirement.rawInput}
        initialModel={hasModel ? (requirement.model as FiveLayerModel) : undefined}
        initialConfidence={requirement.confidence as Record<string, number> | undefined}
        mode={hasModel ? 'view' : 'generate'}
      />
    </div>
  )
}
