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
      <section className="mt-8 rounded-lg border bg-muted/30 p-6">
        <h2 className="text-base font-semibold mb-2">How Knowledge Base Works</h2>
        <p className="text-sm text-muted-foreground mb-2">
          Uploaded documents, connected repositories, and past clarification sessions are automatically
          retrieved when you structure or refine requirements.
        </p>
        <p className="text-sm text-muted-foreground">
          Citations appear on each requirement showing which sources influenced the AI&apos;s suggestions.
        </p>
      </section>
    </div>
  )
}
