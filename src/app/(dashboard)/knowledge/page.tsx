import { KnowledgeClient } from './knowledge-client'
import { RepoSection } from './repo-section'

export const dynamic = 'force-dynamic'

export default function KnowledgePage() {
  return (
    <div className="space-y-8">
      <section className="app-panel-dark surface-grid relative overflow-hidden px-6 py-7 sm:px-8 sm:py-8">
        <div className="absolute right-[-5rem] top-[-4rem] h-44 w-44 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="relative max-w-3xl space-y-4">
          <p className="app-kicker text-cyan-200/90">Knowledge loop</p>
          <h1 className="app-display text-4xl font-semibold leading-none text-white sm:text-5xl">
            让上下文成为可检索的长期记忆
          </h1>
          <p className="text-base leading-7 text-white/70">
            上传文档、连接代码仓库，把系统从单次生成工具升级为持续积累上下文的研究控制台。
          </p>
        </div>
      </section>
      <KnowledgeClient />
      <RepoSection />
      <section className="app-panel p-6">
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
