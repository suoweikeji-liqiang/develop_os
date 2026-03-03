import Link from 'next/link'
import type { ReactNode } from 'react'
import { Bot, Orbit, Radar, ShieldCheck } from 'lucide-react'

interface AuthShellProps {
  eyebrow: string
  title: string
  description: string
  supportLink?: ReactNode
  children: ReactNode
}

const SYSTEM_SIGNALS = [
  {
    icon: Bot,
    title: 'AI Structuring',
    description: '把模糊需求压缩成可演化的结构化资产。',
  },
  {
    icon: Radar,
    title: 'Conflict Radar',
    description: '自动检测需求内部矛盾与跨需求冲突。',
  },
  {
    icon: Orbit,
    title: 'Knowledge Loop',
    description: '用文档、代码库和历史对话持续补强上下文。',
  },
]

export function AuthShell({
  eyebrow,
  title,
  description,
  supportLink,
  children,
}: AuthShellProps) {
  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-6 sm:px-6 lg:px-8">
      <div className="app-container grid gap-6 lg:min-h-[calc(100vh-3rem)] lg:grid-cols-[1.1fr_0.9fr]">
        <section className="app-panel-dark surface-grid order-2 relative overflow-hidden px-5 py-6 sm:px-8 sm:py-10 lg:order-1 lg:px-10">
          <div className="absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top,rgba(92,150,255,0.32),transparent_70%)]" />
          <div className="relative flex flex-col gap-8 lg:h-full lg:justify-between lg:gap-10">
            <div className="space-y-8">
              <Link
                href="/login"
                className="inline-flex items-center gap-3 rounded-full border border-white/12 bg-white/8 px-4 py-2 text-sm text-white/90"
              >
                <span className="flex size-9 items-center justify-center rounded-full bg-white/10 text-sm font-semibold">
                  D
                </span>
                <span className="space-y-0.5">
                  <span className="block text-left font-semibold tracking-[0.16em] uppercase text-white">
                    DevOS
                  </span>
                  <span className="block text-left text-xs text-white/55">
                    Future Requirements Console
                  </span>
                </span>
              </Link>

              <div className="max-w-xl space-y-5">
                <p className="app-kicker text-cyan-200/90">{eyebrow}</p>
                <h1 className="app-display max-w-lg text-4xl font-semibold leading-none text-white sm:text-5xl">
                  {title}
                </h1>
                <p className="max-w-xl text-base leading-7 text-white/72 sm:text-lg">
                  {description}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {SYSTEM_SIGNALS.map((signal) => {
                  const Icon = signal.icon
                  return (
                    <div key={signal.title} className="app-metric">
                      <div className="mb-3 flex size-10 items-center justify-center rounded-2xl bg-cyan-400/14 text-cyan-200">
                        <Icon className="size-4" />
                      </div>
                      <p className="text-sm font-semibold text-white">{signal.title}</p>
                      <p className="mt-2 text-sm leading-6 text-white/60">{signal.description}</p>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="rounded-[26px] border border-white/10 bg-white/7 p-5 backdrop-blur-sm">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-white/80">
                <ShieldCheck className="size-4 text-cyan-200" />
                Trusted Workflow Layer
              </div>
              <p className="text-sm leading-6 text-white/62">
                从探索、建模、冲突扫描到共识签字，所有变更都围绕同一条需求演化链展开。
              </p>
              {supportLink && (
                <div className="mt-4 text-sm text-white/72">
                  {supportLink}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="app-panel order-1 flex items-center px-5 py-6 sm:px-8 sm:py-8 lg:order-2">
          <div className="mx-auto w-full max-w-md">
            {children}
          </div>
        </section>
      </div>
    </div>
  )
}
