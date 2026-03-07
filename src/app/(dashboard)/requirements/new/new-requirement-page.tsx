import { verifySession } from '@/lib/dal'
import { Compass, FileText, Radar } from 'lucide-react'
import { RequirementForm } from './requirement-form'

export const dynamic = 'force-dynamic'

// Primary location: this page now owns the Requirement intake entry.
// `/explorations/new` remains as a legacy alias.
export default async function NewRequirementPage() {
  await verifySession()

  return (
    <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
      <section className="app-panel-dark surface-grid relative overflow-hidden px-6 py-7 sm:px-8 sm:py-8">
        <div className="absolute left-[18%] top-[-4rem] h-40 w-40 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="relative space-y-8">
          <div className="space-y-4">
            <p className="app-kicker text-cyan-200/90">New Requirement</p>
            <h1 className="app-display text-4xl font-semibold leading-none text-white">
              把新的需求上下文推入 Requirement Worksurface
            </h1>
            <p className="max-w-xl text-base leading-7 text-white/70">
              录入原始场景后，系统会从这里启动 Requirement、Requirement Units、Issue Queue 和 Stability 的后续推进链条。
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <div className="app-metric">
              <Compass className="size-5 text-cyan-200" />
              <p className="mt-4 text-sm font-semibold text-white">Context first</p>
              <p className="mt-2 text-sm leading-6 text-white/58">
                把真实约束、目标和环境一次性讲清楚。
              </p>
            </div>
            <div className="app-metric">
              <FileText className="size-5 text-cyan-200" />
              <p className="mt-4 text-sm font-semibold text-white">Signal capture</p>
              <p className="mt-2 text-sm leading-6 text-white/58">
                支持直接粘贴文本，也可以从本地文件导入草稿。
              </p>
            </div>
            <div className="app-metric">
              <Radar className="size-5 text-cyan-200" />
              <p className="mt-4 text-sm font-semibold text-white">Model activation</p>
              <p className="mt-2 text-sm leading-6 text-white/58">
                生成后立即进入可对话、可评审、可演化的工作区。
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="space-y-2">
          <p className="app-kicker">Requirement Intake</p>
          <h2 className="text-3xl font-semibold text-slate-950">创建 Requirement 入口</h2>
        </div>
        <RequirementForm />
      </section>
    </div>
  )
}
