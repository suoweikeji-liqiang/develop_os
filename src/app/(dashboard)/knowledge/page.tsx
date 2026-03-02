import { KnowledgeClient } from './knowledge-client'
import { RepoSection } from './repo-section'

export const dynamic = 'force-dynamic'

export default function KnowledgePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Knowledge Base</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload documents for AI to reference during requirement structuring.
        </p>
      </div>
      <KnowledgeClient />
      <RepoSection />
    </div>
  )
}
