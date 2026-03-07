import Link from 'next/link'
import { ArrowRight, Atom, GitBranch, ShieldCheck, Sparkles } from 'lucide-react'
import { verifySession } from '@/lib/dal'
import { prisma } from '@/server/db/client'
import { STABILITY_LABELS } from '@/lib/requirement-evolution'
import { Badge } from '@/components/ui/badge'
import { HIGH_RISK_CHANGE_LEVELS, OPEN_CHANGE_STATUSES } from '@/server/requirements/change-units'

export default async function DashboardPage() {
  const session = await verifySession()
  const [
    totalRequirements,
    activeReviews,
    lowStabilityRequirements,
    blockingIssues,
    unitizedRequirements,
    pendingReviewChanges,
    highRiskOpenChanges,
    recentRequirements,
  ] = await Promise.all([
    prisma.requirement.count(),
    prisma.requirement.count({
      where: {
        status: {
          in: ['IN_REVIEW', 'CONSENSUS'],
        },
      },
    }),
    prisma.requirement.count({
      where: {
        stabilityLevel: {
          in: ['S0_IDEA', 'S1_ROUGHLY_DEFINED'],
        },
      },
    }),
    prisma.issueUnit.count({
      where: {
        blockDev: true,
        status: {
          in: ['OPEN', 'TRIAGED', 'IN_PROGRESS', 'WAITING_CONFIRMATION'],
        },
      },
    }),
    prisma.requirement.count({
      where: {
        requirementUnits: {
          some: {},
        },
      },
    }),
    prisma.changeUnit.count({
      where: {
        status: {
          in: ['UNDER_REVIEW', 'APPROVED'],
        },
      },
    }),
    prisma.changeUnit.count({
      where: {
        status: {
          in: [...OPEN_CHANGE_STATUSES],
        },
        riskLevel: {
          in: [...HIGH_RISK_CHANGE_LEVELS],
        },
      },
    }),
    prisma.requirement.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 4,
      select: {
        id: true,
        title: true,
        status: true,
        stabilityLevel: true,
        version: true,
        updatedAt: true,
      },
    }),
  ])

  const launchCards = [
    {
      href: '/requirements/new',
      title: 'New Requirement',
      description: '把一个真实上下文送进系统，生成第一版 Requirement Worksurface 与推进骨架。',
      icon: Sparkles,
    },
    {
      href: '/requirements',
      title: 'Review Requirements',
      description: '按状态、角色与时间回看 Requirement 工作面，快速定位正在推进的需求。',
      icon: Atom,
    },
    ...(session.isAdmin
      ? [{
        href: '/admin/users',
        title: 'Route People & Roles',
        description: '管理账户、角色视图与邀请，让协作链条持续保持清晰。',
        icon: ShieldCheck,
      }]
      : []),
  ]

  return (
    <div className="space-y-8">
      <section className="app-panel-dark surface-grid relative overflow-hidden px-6 py-7 sm:px-8 sm:py-9">
        <div className="absolute right-[-4rem] top-[-4rem] h-48 w-48 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute bottom-[-8rem] left-[10%] h-56 w-56 rounded-full bg-blue-500/18 blur-3xl" />

        <div className="relative grid gap-8 xl:grid-cols-[minmax(0,1.3fr)_420px]">
          <div className="space-y-6">
            <div className="space-y-4">
              <p className="app-kicker text-cyan-200/90">Control Layer</p>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="app-display text-4xl font-semibold leading-none text-white sm:text-5xl">
                  用一套未来感控制台管理需求演化
                </h1>
                <Badge className="rounded-full border-white/12 bg-white/10 px-3 py-1 text-white hover:bg-white/10">
                  DevOS
                </Badge>
              </div>
              <p className="max-w-2xl text-base leading-7 text-white/70 sm:text-lg">
                从原始上下文到结构化 ModelCard，再到冲突扫描、对话修正和角色签字，
                每一次需求变化都被收束到同一条演化链里。
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <div className="app-metric">
                <p className="text-[0.68rem] uppercase tracking-[0.24em] text-white/55">Requirements</p>
                <p className="mt-3 text-3xl font-semibold text-white">{totalRequirements}</p>
                <p className="mt-2 text-sm text-white/60">累计进入系统的需求工作面</p>
              </div>
              <div className="app-metric">
                <p className="text-[0.68rem] uppercase tracking-[0.24em] text-white/55">Consensus Queue</p>
                <p className="mt-3 text-3xl font-semibold text-white">{activeReviews}</p>
                <p className="mt-2 text-sm text-white/60">正在评审或等待共识确认</p>
              </div>
              <div className="app-metric">
                <p className="text-[0.68rem] uppercase tracking-[0.24em] text-white/55">Low Stability</p>
                <p className="mt-3 text-3xl font-semibold text-white">{lowStabilityRequirements}</p>
                <p className="mt-2 text-sm text-white/60">仍处于低稳定度的需求</p>
              </div>
              <div className="app-metric">
                <p className="text-[0.68rem] uppercase tracking-[0.24em] text-white/55">Blocking / Unitized</p>
                <p className="mt-3 text-3xl font-semibold text-white">{blockingIssues} / {unitizedRequirements}</p>
                <p className="mt-2 text-sm text-white/60">阻断问题总数 / 已对象化需求数</p>
              </div>
              <div className="app-metric">
                <p className="text-[0.68rem] uppercase tracking-[0.24em] text-white/55">Changes</p>
                <p className="mt-3 text-3xl font-semibold text-white">{pendingReviewChanges} / {highRiskOpenChanges}</p>
                <p className="mt-2 text-sm text-white/60">待评审变更数 / 高风险未完成变更数</p>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/7 p-5 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-sm font-medium text-white/80">
              <GitBranch className="size-4 text-cyan-200" />
              Recent activity
            </div>
            <div className="mt-5 space-y-3">
              {recentRequirements.length === 0 ? (
                <div className="rounded-[22px] border border-white/10 bg-white/6 px-4 py-5 text-sm text-white/55">
                  还没有 Requirement，先创建一个新的需求入口。
                </div>
              ) : (
                recentRequirements.map((item) => (
                  <Link
                    key={item.id}
                    href={`/requirements/${item.id}`}
                    className="block rounded-[22px] border border-white/10 bg-white/6 px-4 py-4 hover:bg-white/10"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="line-clamp-1 text-sm font-medium text-white">{item.title}</p>
                      <span className="app-chip-dark">v{item.version}</span>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-white/48">
                      <span>{item.status} · {STABILITY_LABELS[item.stabilityLevel]}</span>
                      <span>{item.updatedAt.toLocaleDateString('zh-CN')}</span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_0.85fr]">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {launchCards.map((card) => {
            const Icon = card.icon
            return (
              <Link
                key={card.href}
                href={card.href}
                className="app-panel group flex min-h-[220px] flex-col justify-between p-5 sm:p-6"
              >
                <div className="space-y-4">
                  <div className="flex size-12 items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,rgba(32,99,246,0.12),rgba(15,195,255,0.18))] text-primary">
                    <Icon className="size-5" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-xl font-semibold text-slate-950">{card.title}</h2>
                    <p className="text-sm leading-6 text-slate-500">{card.description}</p>
                  </div>
                </div>
                <div className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-slate-900">
                  打开工作面
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            )
          })}
        </div>

        <div className="app-panel p-6">
          <p className="app-kicker">Operator profile</p>
          <h2 className="mt-3 text-2xl font-semibold text-slate-950">当前协作角色</h2>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            你的视图权限会影响可见的评审清单、签字流程和关键交互面板。
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            {session.roles.length > 0 ? (
              session.roles.map((role) => (
                <span key={role} className="app-chip">
                  {role}
                </span>
              ))
            ) : (
              <span className="app-chip">暂无显式角色</span>
            )}
            {session.isAdmin && <span className="app-chip">ADMIN ROOT</span>}
          </div>

          <div className="mt-6 rounded-[24px] border border-slate-200/80 bg-slate-950 px-5 py-4 text-white">
            <p className="text-[0.68rem] uppercase tracking-[0.24em] text-white/45">Session</p>
            <p className="mt-3 break-all text-sm text-white/82">{session.userId}</p>
          </div>
        </div>
      </section>
    </div>
  )
}
