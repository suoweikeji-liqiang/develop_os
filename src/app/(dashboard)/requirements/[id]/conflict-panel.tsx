'use client'

// Primary location: Requirement detail now owns the conflict evidence panel.

import { useCallback, useEffect, useState } from 'react'
import { buildConflictProjectionStatusMeta } from '@/lib/issue-queue'

type ConflictStatus = 'OPEN' | 'DISMISSED' | 'RESOLVED'
type ConflictScope = 'INTERNAL' | 'CROSS_REQUIREMENT'
type ConflictSeverity = 'LOW' | 'MEDIUM' | 'HIGH'

interface ConflictItem {
  id: string
  status: ConflictStatus
  scope: ConflictScope
  severity: ConflictSeverity
  title: string
  summary: string
  rationale: string
  evidence: string[]
  recommendedAction: string
  resolutionNote: string | null
  relatedRequirement?: { id: string; title: string } | null
  updatedAt: string
}

interface Props {
  requirementId: string
  hasModel: boolean
  onDataChanged?: () => void
}

const STATUS_LABELS: Record<ConflictStatus, string> = {
  OPEN: '待处理',
  DISMISSED: '已驳回',
  RESOLVED: '已处理',
}

const SCOPE_LABELS: Record<ConflictScope, string> = {
  INTERNAL: '内部矛盾',
  CROSS_REQUIREMENT: '跨需求冲突',
}

const SEVERITY_LABELS: Record<ConflictSeverity, string> = {
  LOW: '低',
  MEDIUM: '中',
  HIGH: '高',
}

const SEVERITY_CLASSES: Record<ConflictSeverity, string> = {
  LOW: 'bg-slate-100 text-slate-700',
  MEDIUM: 'bg-amber-100 text-amber-800',
  HIGH: 'bg-red-100 text-red-700',
}

export function ConflictPanel({ requirementId, hasModel, onDataChanged }: Props) {
  const [conflicts, setConflicts] = useState<ConflictItem[]>([])
  const [loading, setLoading] = useState(hasModel)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadConflicts = useCallback(async () => {
    if (!hasModel) {
      setConflicts([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const input = encodeURIComponent(JSON.stringify({ requirementId }))
      const res = await fetch(`/api/trpc/conflict.list?input=${input}`)
      const data = await res.json()
      const raw: ConflictItem[] = data.result?.data?.json ?? []
      setConflicts(raw.map((item) => ({ ...item, updatedAt: String(item.updatedAt) })))
    } catch {
      setError('加载冲突结果失败')
    } finally {
      setLoading(false)
    }
  }, [hasModel, requirementId])

  useEffect(() => {
    void loadConflicts()
  }, [loadConflicts])

  async function handleScan() {
    setScanning(true)
    setError(null)

    try {
      const res = await fetch('/api/trpc/conflict.scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requirementId }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error?.message ?? '重新扫描失败')
      }

      await loadConflicts()
      onDataChanged?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : '重新扫描失败')
    } finally {
      setScanning(false)
    }
  }

  async function updateStatus(conflictId: string, status: ConflictStatus, resolutionNote?: string) {
    const res = await fetch('/api/trpc/conflict.updateStatus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conflictId, status, resolutionNote }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => null)
      throw new Error(data?.error?.message ?? '更新冲突状态失败')
    }

    await loadConflicts()
    onDataChanged?.()
  }

  async function handleDismiss(conflictId: string) {
    try {
      await updateStatus(conflictId, 'DISMISSED', '已人工确认当前告警不成立')
    } catch (err) {
      setError(err instanceof Error ? err.message : '驳回失败')
    }
  }

  async function handleResolve(conflictId: string) {
    try {
      await updateStatus(conflictId, 'RESOLVED', '已安排处理或已完成修正')
    } catch (err) {
      setError(err instanceof Error ? err.message : '标记处理失败')
    }
  }

  const openCount = conflicts.filter((item) => item.status === 'OPEN').length
  const resolvedCount = conflicts.filter((item) => item.status === 'RESOLVED').length
  const dismissedCount = conflicts.filter((item) => item.status === 'DISMISSED').length

  return (
    <section className="rounded-lg border border-gray-200 p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-700">冲突检测</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            保留为扫描详情与证据面；默认问题推进请优先回到上方 Issue Queue。
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
            <span className="app-chip">待处理 {openCount}</span>
            <span className="app-chip">已处理 {resolvedCount}</span>
            <span className="app-chip">已驳回 {dismissedCount}</span>
            <a
              href="#issue-queue"
              className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-700 hover:bg-slate-50"
            >
              回到 Issue Queue
            </a>
          </div>
        </div>
        <button
          onClick={() => void handleScan()}
          disabled={!hasModel || scanning}
          className="rounded border px-3 py-1 text-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
        >
          {scanning ? '扫描中...' : '重新扫描'}
        </button>
      </div>

      {!hasModel && (
        <p className="text-sm text-gray-500">生成 ModelCard 后会自动触发冲突扫描。</p>
      )}

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {hasModel && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="rounded-full bg-gray-100 px-2 py-1">总数 {conflicts.length}</span>
          <span className="rounded-full bg-red-50 px-2 py-1 text-red-600">待处理 {openCount}</span>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-400">加载冲突结果...</p>
      ) : conflicts.length === 0 ? (
        hasModel ? <p className="text-sm text-gray-500">当前未检测到明显冲突。</p> : null
      ) : (
        <ul className="space-y-3">
          {conflicts.map((conflict) => {
            const projectionStatus = buildConflictProjectionStatusMeta(conflict.status)

            return (
            <li key={conflict.id} className="rounded-md border p-4 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${SEVERITY_CLASSES[conflict.severity]}`}>
                  风险 {SEVERITY_LABELS[conflict.severity]}
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                  {SCOPE_LABELS[conflict.scope]}
                </span>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                  {STATUS_LABELS[conflict.status]}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  conflict.status === 'OPEN'
                    ? 'bg-sky-100 text-sky-800'
                    : conflict.status === 'RESOLVED'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-amber-100 text-amber-800'
                }`}>
                  {projectionStatus.label}
                </span>
              </div>

              <div>
                <h4 className="font-medium text-gray-900">{conflict.title}</h4>
                <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{conflict.summary}</p>
              </div>

              <div className="space-y-1 text-sm text-gray-600">
                <p><span className="font-medium text-gray-800">原因：</span>{conflict.rationale}</p>
                <p><span className="font-medium text-gray-800">建议动作：</span>{conflict.recommendedAction}</p>
                {conflict.relatedRequirement && (
                  <p>
                    <span className="font-medium text-gray-800">相关需求：</span>
                    <a href={`/requirements/${conflict.relatedRequirement.id}`} className="text-blue-600 hover:underline">
                      {conflict.relatedRequirement.title}
                    </a>
                  </p>
                )}
              </div>

              {conflict.evidence.length > 0 && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Evidence</p>
                  <ul className="mt-1 space-y-1 text-sm text-gray-700">
                    {conflict.evidence.map((item, index) => (
                      <li key={`${conflict.id}-${index}`} className="rounded bg-slate-50 px-2 py-1">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {conflict.resolutionNote && (
                <p className="text-sm text-gray-500">
                  处理备注：{conflict.resolutionNote}
                </p>
              )}

              <div className="rounded-md border border-slate-200/80 bg-slate-50/80 px-3 py-3 text-sm text-slate-600">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Projection 关系</p>
                <p className="mt-2 leading-6">{projectionStatus.summary}</p>
              </div>

              {conflict.status === 'OPEN' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => void handleResolve(conflict.id)}
                    className="rounded bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-700"
                  >
                    兼容入口：同步标记已处理
                  </button>
                  <button
                    onClick={() => void handleDismiss(conflict.id)}
                    className="rounded bg-gray-100 px-3 py-1 text-sm text-gray-700 hover:bg-gray-200"
                  >
                    兼容入口：同步驳回
                  </button>
                </div>
              )}
            </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
