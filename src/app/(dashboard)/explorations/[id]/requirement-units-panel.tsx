'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { REQUIREMENT_UNIT_STATUS_LABELS } from '@/lib/requirement-evolution'
import { StabilityBadge } from './stability-badge'

interface RequirementUnitItem {
  id: string
  unitKey: string
  title: string
  summary: string
  layer: string
  status: keyof typeof REQUIREMENT_UNIT_STATUS_LABELS
  stabilityLevel: string
  stabilityScore: number | null
  stabilityReason: string | null
  ownerId: string | null
  sourceType: string | null
  sourceRef: string | null
  updatedAt: string
  _count: {
    issueUnits: number
    childUnits: number
  }
}

interface Props {
  requirementId: string
}

export function RequirementUnitsPanel({ requirementId }: Props) {
  const [items, setItems] = useState<RequirementUnitItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadItems = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const input = encodeURIComponent(JSON.stringify({ requirementId }))
      const res = await fetch(`/api/trpc/requirementUnit.listByRequirement?input=${input}`)
      if (!res.ok) throw new Error('加载 Requirement Units 失败')
      const data = await res.json()
      const payload = (data.result?.data?.json ?? data.result?.data ?? []) as RequirementUnitItem[]
      setItems(Array.isArray(payload) ? payload : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载 Requirement Units 失败')
    } finally {
      setLoading(false)
    }
  }, [requirementId])

  useEffect(() => {
    void loadItems()
  }, [loadItems])

  const summary = useMemo(() => {
    const readyCount = items.filter((item) => item.status === 'READY_FOR_DEV').length
    const stableCount = items.filter((item) => (
      item.stabilityLevel === 'S3_ALMOST_READY'
      || item.stabilityLevel === 'S4_READY_FOR_DEVELOPMENT'
      || item.stabilityLevel === 'S5_VERIFIED_STABLE'
    )).length

    return {
      total: items.length,
      readyCount,
      stableCount,
    }
  }, [items])

  return (
    <section className="app-panel p-4 sm:p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-600">Requirement Units</h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            把整份需求拆成可追踪对象单元。第一阶段先提供只读查询与基础可见性。
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="app-chip">总数 {summary.total}</span>
          <span className="app-chip">较稳定 {summary.stableCount}</span>
          <span className="app-chip">可开发 {summary.readyCount}</span>
        </div>
      </div>

      {loading ? <p className="text-sm text-slate-400">加载 Requirement Units...</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {!loading && !error && items.length === 0 ? (
        <div className="rounded-[22px] border border-dashed border-slate-300 px-4 py-5 text-sm text-slate-500">
          当前还没有 Requirement Unit。下一步可以先接入最小创建入口或模型草稿初始化。
        </div>
      ) : null}

      {!loading && !error && items.length > 0 ? (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id} className="rounded-[22px] border border-slate-200/80 bg-slate-50/70 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="app-chip">{item.unitKey}</span>
                <span className="app-chip capitalize">{item.layer}</span>
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
                  {REQUIREMENT_UNIT_STATUS_LABELS[item.status] ?? item.status}
                </span>
                <StabilityBadge level={item.stabilityLevel} />
              </div>

              <div className="mt-3">
                <h4 className="text-sm font-semibold text-slate-900">{item.title}</h4>
                <p className="mt-1 text-sm leading-6 text-slate-600 whitespace-pre-wrap">{item.summary}</p>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                <span className="app-chip">关联问题 {item._count.issueUnits}</span>
                <span className="app-chip">子单元 {item._count.childUnits}</span>
                {item.stabilityScore !== null ? <span className="app-chip">稳定度分 {item.stabilityScore}</span> : null}
                {item.ownerId ? <span className="app-chip">Owner {item.ownerId}</span> : null}
              </div>

              {item.stabilityReason ? (
                <p className="mt-3 text-xs leading-5 text-slate-500">
                  稳定度说明：{item.stabilityReason}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
