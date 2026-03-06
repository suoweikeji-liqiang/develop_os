'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ISSUE_UNIT_SEVERITY_CLASSES,
  ISSUE_UNIT_SEVERITY_LABELS,
  ISSUE_UNIT_STATUS_LABELS,
} from '@/lib/requirement-evolution'

interface IssueUnitItem {
  id: string
  type: string
  severity: keyof typeof ISSUE_UNIT_SEVERITY_LABELS
  title: string
  description: string
  status: keyof typeof ISSUE_UNIT_STATUS_LABELS
  blockDev: boolean
  sourceType: string | null
  sourceRef: string | null
  suggestedResolution: string | null
  ownerId: string | null
  updatedAt: string
  primaryRequirementUnit: {
    id: string
    unitKey: string
    title: string
  } | null
}

interface Props {
  requirementId: string
}

export function IssueUnitsPanel({ requirementId }: Props) {
  const [items, setItems] = useState<IssueUnitItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadItems = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const input = encodeURIComponent(JSON.stringify({ requirementId }))
      const res = await fetch(`/api/trpc/issueUnit.listByRequirement?input=${input}`)
      if (!res.ok) throw new Error('加载 Issue Queue 失败')
      const data = await res.json()
      const payload = (data.result?.data?.json ?? data.result?.data ?? []) as IssueUnitItem[]
      setItems(Array.isArray(payload) ? payload : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载 Issue Queue 失败')
    } finally {
      setLoading(false)
    }
  }, [requirementId])

  useEffect(() => {
    void loadItems()
  }, [loadItems])

  const summary = useMemo(() => ({
    total: items.length,
    open: items.filter((item) => item.status === 'OPEN' || item.status === 'TRIAGED' || item.status === 'IN_PROGRESS' || item.status === 'WAITING_CONFIRMATION').length,
    blocking: items.filter((item) => item.blockDev && item.status !== 'RESOLVED' && item.status !== 'REJECTED' && item.status !== 'ARCHIVED').length,
  }), [items])

  return (
    <section className="app-panel p-4 sm:p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-600">Issue Queue</h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            把模糊项、缺失项、风险项和待确认项对象化。第一阶段先接基础查询，不替换现有冲突扫描。
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="app-chip">总数 {summary.total}</span>
          <span className="app-chip">未关闭 {summary.open}</span>
          <span className="app-chip">阻断 {summary.blocking}</span>
        </div>
      </div>

      {loading ? <p className="text-sm text-slate-400">加载 Issue Queue...</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {!loading && !error && items.length === 0 ? (
        <div className="rounded-[22px] border border-dashed border-slate-300 px-4 py-5 text-sm text-slate-500">
          当前还没有 Issue Unit。现有 Conflict Scan 仍保留，后续可逐步把更多问题对象化。
        </div>
      ) : null}

      {!loading && !error && items.length > 0 ? (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id} className="rounded-[22px] border border-slate-200/80 bg-slate-50/70 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${ISSUE_UNIT_SEVERITY_CLASSES[item.severity]}`}>
                  风险 {ISSUE_UNIT_SEVERITY_LABELS[item.severity]}
                </span>
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
                  {ISSUE_UNIT_STATUS_LABELS[item.status] ?? item.status}
                </span>
                <span className="app-chip">{item.type}</span>
                {item.blockDev ? (
                  <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700">
                    阻断开发
                  </span>
                ) : null}
              </div>

              <div className="mt-3">
                <h4 className="text-sm font-semibold text-slate-900">{item.title}</h4>
                <p className="mt-1 text-sm leading-6 text-slate-600 whitespace-pre-wrap">{item.description}</p>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                {item.primaryRequirementUnit ? (
                  <span className="app-chip">
                    关联单元 {item.primaryRequirementUnit.unitKey} · {item.primaryRequirementUnit.title}
                  </span>
                ) : null}
                {item.ownerId ? <span className="app-chip">Owner {item.ownerId}</span> : null}
              </div>

              {item.suggestedResolution ? (
                <p className="mt-3 text-xs leading-5 text-slate-500">
                  建议处理：{item.suggestedResolution}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
