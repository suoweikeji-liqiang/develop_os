import Link from 'next/link'
import { ArrowRight, Orbit, Radar, Waves } from 'lucide-react'
import { verifySession } from '@/lib/dal'
import { prisma } from '@/server/db/client'
import { attachRequirementOverviewStats } from '@/server/requirements/overview'
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
      stabilityLevel: true,
      tags: true,
      createdBy: true,
      createdAt: true,
      updatedAt: true,
      version: true,
    },
  })

  const enriched = await attachRequirementOverviewStats(requirements)

  const serialized = enriched.map((req) => ({
    ...req,
    createdAt: req.createdAt.toISOString(),
    updatedAt: req.updatedAt.toISOString(),
  }))

  const headings: Record<ListView, {
    eyebrow: string
    title: string
    subtitle: string
    icon: typeof Orbit
  }> = {
    explorations: {
      eyebrow: 'Signal Flow',
      title: '探索流总览',
      subtitle: '把上下文、对话、实验和模型演化收束到一张连续的需求轨迹图上。',
      icon: Orbit,
    },
    models: {
      eyebrow: 'Model Assets',
      title: '结构化模型资产',
      subtitle: '聚焦已经进入建模阶段的需求，观察哪些抽象正在变得稳定且可复用。',
      icon: Radar,
    },
    evolution: {
      eyebrow: 'Version Drift',
      title: '演化视图',
      subtitle: '从版本变化的角度审视需求如何被修正、收敛、冲突或再抽象。',
      icon: Waves,
    },
  }

  const heading = headings[listView]
  const Icon = heading.icon
  const evolvedCount = serialized.filter((item) => item.version > 1).length
  const taggedCount = serialized.filter((item) => item.tags.length > 0).length
  const lowStabilityCount = serialized.filter((item) => (
    item.stabilityLevel === 'S0_IDEA' || item.stabilityLevel === 'S1_ROUGHLY_DEFINED'
  )).length

  return (
    <div className="space-y-8">
      <section className="app-panel-dark surface-grid relative overflow-hidden px-6 py-7 sm:px-8 sm:py-8">
        <div className="absolute right-[-6rem] top-[-5rem] h-48 w-48 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-5">
            <div className="inline-flex size-12 items-center justify-center rounded-[18px] bg-white/8 text-cyan-200">
              <Icon className="size-5" />
            </div>
            <div className="space-y-3">
              <p className="app-kicker text-cyan-200/90">{heading.eyebrow}</p>
              <h1 className="app-display text-4xl font-semibold leading-none text-white sm:text-5xl">
                {heading.title}
              </h1>
              <p className="max-w-2xl text-base leading-7 text-white/70">
                {heading.subtitle}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <div className="app-metric">
              <p className="text-[0.68rem] uppercase tracking-[0.24em] text-white/50">Entries</p>
              <p className="mt-3 text-3xl font-semibold text-white">{serialized.length}</p>
              <p className="mt-2 text-sm text-white/58">当前视图中的总条目数</p>
            </div>
            <div className="app-metric">
              <p className="text-[0.68rem] uppercase tracking-[0.24em] text-white/50">Evolved</p>
              <p className="mt-3 text-3xl font-semibold text-white">{evolvedCount}</p>
              <p className="mt-2 text-sm text-white/58">已经发生过版本迭代的条目</p>
            </div>
            <div className="app-metric">
              <p className="text-[0.68rem] uppercase tracking-[0.24em] text-white/50">Tagged</p>
              <p className="mt-3 text-3xl font-semibold text-white">{taggedCount}</p>
              <p className="mt-2 text-sm text-white/58">已经被赋予主题标签的条目</p>
            </div>
            <div className="app-metric">
              <p className="text-[0.68rem] uppercase tracking-[0.24em] text-white/50">Low Stability</p>
              <p className="mt-3 text-3xl font-semibold text-white">{lowStabilityCount}</p>
              <p className="mt-2 text-sm text-white/58">仍处于低稳定度的需求条目</p>
            </div>
          </div>
        </div>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="app-kicker">Launch lane</p>
          <h2 className="text-2xl font-semibold text-slate-950">
            在当前流里继续推进
          </h2>
        </div>
        <Link
          href="/explorations/new"
          className="inline-flex items-center gap-2 rounded-full border border-cyan-300/50 bg-[linear-gradient(135deg,rgba(32,99,246,0.98),rgba(15,195,255,0.92))] px-5 py-3 text-sm font-medium text-white shadow-[0_18px_48px_rgba(31,109,255,0.28)] hover:-translate-y-0.5"
        >
          Start Exploration
          <ArrowRight className="size-4" />
        </Link>
      </section>

      <div className="space-y-2">
        <h3 className="text-sm font-medium uppercase tracking-[0.22em] text-slate-500">
          Active list
        </h3>
      </div>

      <ExplorationsListClient initialRequirements={serialized} initialView={listView} />
    </div>
  )
}
