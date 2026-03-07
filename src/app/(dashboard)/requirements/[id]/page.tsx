import { notFound } from 'next/navigation'
import type { UIMessage } from 'ai'
import type { FiveLayerModel } from '@/lib/schemas/requirement'
import { verifySession } from '@/lib/dal'
import { prisma } from '@/server/db/client'
import { CommentsPanel } from './comments-panel'
import { RequirementDetailClient } from './requirement-detail-client'

export const dynamic = 'force-dynamic'

// Primary location: `/requirements/[id]` now owns the Requirement worksurface
// server page. `/explorations/[id]` remains as a legacy alias wrapper only.
export default async function RequirementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await verifySession()
  const { id } = await params

  const requirement = await prisma.requirement.findUnique({
    where: { id },
  })

  if (!requirement) notFound()

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
    <div className="flex flex-col gap-6">
      <RequirementDetailClient
        requirementId={requirement.id}
        title={requirement.title}
        status={requirement.status}
        stabilityLevel={requirement.stabilityLevel}
        stabilityScore={requirement.stabilityScore}
        stabilityReason={requirement.stabilityReason}
        version={requirement.version}
        rawInput={requirement.rawInput}
        initialModel={requirement.model ? (requirement.model as FiveLayerModel) : undefined}
        initialConfidence={requirement.confidence as Record<string, number> | undefined}
        initialCitations={Array.isArray(requirement.citations) ? (requirement.citations as unknown[]) : undefined}
        initialMessages={initialMessages}
        userRoles={session.roles}
        isAdmin={session.isAdmin}
      />
      <section className="app-panel p-5 sm:p-6">
        <CommentsPanel
          requirementId={requirement.id}
          currentUserId={session.userId}
          isAdmin={session.isAdmin}
        />
      </section>
    </div>
  )
}
