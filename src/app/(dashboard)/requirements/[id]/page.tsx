import { notFound } from 'next/navigation'
import { prisma } from '@/server/db/client'
import { verifySession } from '@/lib/dal'
import { ModelTabs } from './model-tabs'
import { ChatPanel } from './chat-panel'
import type { FiveLayerModel } from '@/lib/schemas/requirement'
import type { UIMessage } from 'ai'

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

  const rawMessages = await prisma.conversationMessage.findMany({
    where: { requirementId: requirement.id },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })
  const initialMessages: UIMessage[] = rawMessages.reverse().map((msg) => ({
    id: msg.id,
    role: msg.role as 'user' | 'assistant',
    parts: Array.isArray(msg.content) ? (msg.content as UIMessage['parts']) : [],
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{requirement.title}</h1>
        <p className="text-sm text-muted-foreground">
          状态: {requirement.status} | 版本: v{requirement.version}
        </p>
      </div>

      <div className={hasModel ? 'grid grid-cols-[1fr_400px] gap-6 items-start' : 'max-w-4xl'}>
        <ModelTabs
          requirementId={requirement.id}
          rawInput={requirement.rawInput}
          initialModel={hasModel ? (requirement.model as FiveLayerModel) : undefined}
          initialConfidence={requirement.confidence as Record<string, number> | undefined}
          mode={hasModel ? 'view' : 'generate'}
        />
        {hasModel && (
          <ChatPanel
            requirementId={requirement.id}
            currentModel={requirement.model as FiveLayerModel}
            initialMessages={initialMessages}
            autoOpen={initialMessages.length > 0}
            onPatchProposed={() => {}}
          />
        )}
      </div>
    </div>
  )
}
