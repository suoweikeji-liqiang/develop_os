'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ISSUE_UNIT_SEVERITY_CLASSES,
  ISSUE_UNIT_SEVERITY_LABELS,
  ISSUE_UNIT_STATUS_LABELS,
  ISSUE_UNIT_STATUS_OPTIONS,
} from '@/lib/requirement-evolution'
import {
  ACTIVE_ISSUE_UNIT_STATUSES,
  buildClarificationQueueStatusMeta,
  getIssueTypeDescription,
  getIssueTypeLabel,
  ISSUE_UNIT_TYPE_OPTIONS,
  mapIssueStatusToConflictStatus,
  type IssueQueueKind,
  type IssueUnitType,
} from '@/lib/issue-queue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

interface IssueUnitItem {
  id: string
  entityId: string
  queueKind: IssueQueueKind
  type: string
  severity: keyof typeof ISSUE_UNIT_SEVERITY_LABELS
  title: string
  description: string
  status: keyof typeof ISSUE_UNIT_STATUS_LABELS
  blockDev: boolean
  sourceType: string | null
  sourceRef: string | null
  sourceLabel: string
  sourceStatus: string | null
  sourceStatusLabel: string | null
  sourceCategory: string | null
  sourceCategoryLabel: string | null
  lifecycle: {
    sourceSummary: string
    blockingSummary: string
    closeMeaning: string
    followupSummary: string
    requiresSourceFollowup: boolean
  }
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
  refreshToken?: number
  onDataChanged?: () => void
}

type BlockingFilter = 'ALL' | 'BLOCKING' | 'NON_BLOCKING'

const BLOCKING_FILTER_OPTIONS: Array<{ value: BlockingFilter; label: string }> = [
  { value: 'ALL', label: '全部阻断状态' },
  { value: 'BLOCKING', label: '仅阻断项' },
  { value: 'NON_BLOCKING', label: '仅非阻断项' },
]

const SEVERITY_FILTER_OPTIONS = [
  { value: 'ALL', label: '全部严重度' },
  { value: 'LOW', label: 'LOW' },
  { value: 'MEDIUM', label: 'MEDIUM' },
  { value: 'HIGH', label: 'HIGH' },
  { value: 'CRITICAL', label: 'CRITICAL' },
] as const

const CONFLICT_STATUS_OPTIONS = ISSUE_UNIT_STATUS_OPTIONS.filter((option) => (
  option.value === 'OPEN' || option.value === 'RESOLVED' || option.value === 'REJECTED'
))

export function IssueUnitsPanel({ requirementId, refreshToken = 0, onDataChanged }: Props) {
  const [items, setItems] = useState<IssueUnitItem[]>([])
  const [unitOptions, setUnitOptions] = useState<Array<{ id: string; unitKey: string; title: string }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [type, setType] = useState<IssueUnitType>('ambiguity')
  const [severity, setSeverity] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [blockDev, setBlockDev] = useState(false)
  const [suggestedResolution, setSuggestedResolution] = useState('')
  const [primaryRequirementUnitId, setPrimaryRequirementUnitId] = useState('')
  const [typeFilter, setTypeFilter] = useState<'ALL' | IssueUnitType>('ALL')
  const [statusFilter, setStatusFilter] = useState<'ALL' | keyof typeof ISSUE_UNIT_STATUS_LABELS>('ALL')
  const [severityFilter, setSeverityFilter] = useState<'ALL' | keyof typeof ISSUE_UNIT_SEVERITY_LABELS>('ALL')
  const [blockingFilter, setBlockingFilter] = useState<BlockingFilter>('ALL')
  const [statusDrafts, setStatusDrafts] = useState<Record<string, {
    status: string
    saving: boolean
    error: string | null
  }>>({})
  const [editDrafts, setEditDrafts] = useState<Record<string, {
    type: IssueUnitType
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    title: string
    description: string
    blockDev: boolean
    suggestedResolution: string
    primaryRequirementUnitId: string
    open: boolean
    saving: boolean
    error: string | null
  }>>({})

  const loadItems = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const input = encodeURIComponent(JSON.stringify({ requirementId }))
      const res = await fetch(`/api/trpc/issueUnit.listByRequirement?input=${input}`)
      if (!res.ok) throw new Error('加载 Issue Queue 失败')
      const data = await res.json()
      const payload = (data.result?.data?.json ?? data.result?.data ?? []) as IssueUnitItem[]
      const nextItems = Array.isArray(payload) ? payload : []
      setItems(nextItems)
      setStatusDrafts(Object.fromEntries(
        nextItems.map((item) => [item.id, {
          status: item.status,
          saving: false,
          error: null,
        }]),
      ))
      setEditDrafts(Object.fromEntries(
        nextItems.map((item) => [item.id, {
          type: ISSUE_UNIT_TYPE_OPTIONS.some((option) => option.value === item.type)
            ? item.type as IssueUnitType
            : 'ambiguity',
          severity: item.severity,
          title: item.title,
          description: item.description,
          blockDev: item.blockDev,
          suggestedResolution: item.suggestedResolution ?? '',
          primaryRequirementUnitId: item.primaryRequirementUnit?.id ?? '',
          open: false,
          saving: false,
          error: null,
        }]),
      ))
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载 Issue Queue 失败')
    } finally {
      setLoading(false)
    }
  }, [requirementId])

  const loadUnitOptions = useCallback(async () => {
    try {
      const input = encodeURIComponent(JSON.stringify({ requirementId }))
      const res = await fetch(`/api/trpc/requirementUnit.listByRequirement?input=${input}`)
      if (!res.ok) return
      const data = await res.json()
      const payload = (data.result?.data?.json ?? data.result?.data ?? []) as Array<{
        id: string
        unitKey: string
        title: string
      }>
      setUnitOptions(Array.isArray(payload) ? payload.map((item) => ({
        id: item.id,
        unitKey: item.unitKey,
        title: item.title,
      })) : [])
    } catch {
      setUnitOptions([])
    }
  }, [requirementId])

  useEffect(() => {
    void loadItems()
    void loadUnitOptions()
  }, [loadItems, loadUnitOptions, refreshToken])

  const summary = useMemo(() => ({
    total: items.length,
    open: items.filter((item) => (ACTIVE_ISSUE_UNIT_STATUSES as readonly string[]).includes(item.status)).length,
    blocking: items.filter((item) => item.blockDev && (ACTIVE_ISSUE_UNIT_STATUSES as readonly string[]).includes(item.status)).length,
  }), [items])

  const filteredItems = useMemo(() => items.filter((item) => {
    if (typeFilter !== 'ALL' && item.type !== typeFilter) return false
    if (statusFilter !== 'ALL' && item.status !== statusFilter) return false
    if (severityFilter !== 'ALL' && item.severity !== severityFilter) return false
    if (blockingFilter === 'BLOCKING' && !item.blockDev) return false
    if (blockingFilter === 'NON_BLOCKING' && item.blockDev) return false
    return true
  }), [blockingFilter, items, severityFilter, statusFilter, typeFilter])

  async function handleCreate() {
    if (!title.trim() || !description.trim()) return

    setCreating(true)
    setCreateError(null)

    try {
      const res = await fetch('/api/trpc/issueUnit.create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requirementId,
          primaryRequirementUnitId: primaryRequirementUnitId || undefined,
          type,
          severity,
          title: title.trim(),
          description: description.trim(),
          blockDev,
          suggestedResolution: suggestedResolution.trim() || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error?.message ?? '创建 Issue Unit 失败')
      }

      setType('ambiguity')
      setSeverity('MEDIUM')
      setTitle('')
      setDescription('')
      setBlockDev(false)
      setSuggestedResolution('')
      setPrimaryRequirementUnitId('')
      await loadItems()
      onDataChanged?.()
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : '创建 Issue Unit 失败')
    } finally {
      setCreating(false)
    }
  }

  function updateStatusDraft(id: string, patch: Partial<{ status: string; saving: boolean; error: string | null }>) {
    setStatusDrafts((prev) => ({
      ...prev,
      [id]: {
        status: prev[id]?.status ?? 'OPEN',
        saving: prev[id]?.saving ?? false,
        error: prev[id]?.error ?? null,
        ...patch,
      },
    }))
  }

  function updateEditDraft(
    id: string,
    patch: Partial<{
      type: IssueUnitType
      severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
      title: string
      description: string
      blockDev: boolean
      suggestedResolution: string
      primaryRequirementUnitId: string
      open: boolean
      saving: boolean
      error: string | null
    }>,
  ) {
    setEditDrafts((prev) => ({
      ...prev,
      [id]: {
        type: prev[id]?.type ?? 'ambiguity',
        severity: prev[id]?.severity ?? 'MEDIUM',
        title: prev[id]?.title ?? '',
        description: prev[id]?.description ?? '',
        blockDev: prev[id]?.blockDev ?? false,
        suggestedResolution: prev[id]?.suggestedResolution ?? '',
        primaryRequirementUnitId: prev[id]?.primaryRequirementUnitId ?? '',
        open: prev[id]?.open ?? false,
        saving: prev[id]?.saving ?? false,
        error: prev[id]?.error ?? null,
        ...patch,
      },
    }))
  }

  async function handleSaveStatus(item: IssueUnitItem) {
    const draft = statusDrafts[item.id]
    if (!draft) return

    updateStatusDraft(item.id, { saving: true, error: null })

    try {
      const res = item.queueKind === 'conflict'
        ? await fetch('/api/trpc/conflict.updateStatus', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              conflictId: item.entityId,
              status: mapIssueStatusToConflictStatus(draft.status),
            }),
          })
        : await fetch('/api/trpc/issueUnit.updateStatus', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              issueUnitId: item.entityId,
              status: draft.status,
            }),
          })
      const data = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(data?.error?.message ?? '更新 Issue Queue 状态失败')
      }

      await loadItems()
      onDataChanged?.()
    } catch (err) {
      updateStatusDraft(item.id, {
        saving: false,
        error: err instanceof Error ? err.message : '更新 Issue Queue 状态失败',
      })
      return
    }

    updateStatusDraft(item.id, { saving: false, error: null })
  }

  async function handleSaveEdit(id: string) {
    const draft = editDrafts[id]
    if (!draft || !draft.title.trim() || !draft.description.trim()) return

    updateEditDraft(id, { saving: true, error: null })

    try {
      const res = await fetch('/api/trpc/issueUnit.update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          issueUnitId: id,
          primaryRequirementUnitId: draft.primaryRequirementUnitId || null,
          type: draft.type,
          severity: draft.severity,
          title: draft.title.trim(),
          description: draft.description.trim(),
          blockDev: draft.blockDev,
          suggestedResolution: draft.suggestedResolution.trim() || null,
        }),
      })
      const data = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(data?.error?.message ?? '更新 Issue Unit 失败')
      }

      await loadItems()
      onDataChanged?.()
      updateEditDraft(id, { open: false, saving: false, error: null })
    } catch (err) {
      updateEditDraft(id, {
        saving: false,
        error: err instanceof Error ? err.message : '更新 Issue Unit 失败',
      })
    }
  }

  return (
    <section className="app-panel p-4 sm:p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-600">Issue Queue</h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Issue Queue 是默认问题推进入口。Clarification 与 Conflict Scan 的结果优先在这里汇总、分诊和跟踪。
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="app-chip">总数 {summary.total}</span>
          <span className="app-chip">未关闭 {summary.open}</span>
          <span className="app-chip">阻断 {summary.blocking}</span>
          <span className="app-chip">筛选结果 {filteredItems.length}</span>
        </div>
      </div>

      <div className="rounded-[22px] border border-slate-200/80 bg-slate-50/70 p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h4 className="text-sm font-semibold text-slate-900">过滤当前问题面</h4>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setTypeFilter('ALL')
              setStatusFilter('ALL')
              setSeverityFilter('ALL')
              setBlockingFilter('ALL')
            }}
          >
            重置过滤
          </Button>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value as 'ALL' | IssueUnitType)}
            className="h-12 rounded-[1.1rem] border border-slate-200 bg-white/72 px-4 text-sm text-slate-800 outline-none focus-visible:border-slate-400"
          >
            <option value="ALL">全部类型</option>
            {ISSUE_UNIT_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as 'ALL' | keyof typeof ISSUE_UNIT_STATUS_LABELS)}
            className="h-12 rounded-[1.1rem] border border-slate-200 bg-white/72 px-4 text-sm text-slate-800 outline-none focus-visible:border-slate-400"
          >
            <option value="ALL">全部状态</option>
            {ISSUE_UNIT_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={severityFilter}
            onChange={(event) => setSeverityFilter(event.target.value as 'ALL' | keyof typeof ISSUE_UNIT_SEVERITY_LABELS)}
            className="h-12 rounded-[1.1rem] border border-slate-200 bg-white/72 px-4 text-sm text-slate-800 outline-none focus-visible:border-slate-400"
          >
            {SEVERITY_FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={blockingFilter}
            onChange={(event) => setBlockingFilter(event.target.value as BlockingFilter)}
            className="h-12 rounded-[1.1rem] border border-slate-200 bg-white/72 px-4 text-sm text-slate-800 outline-none focus-visible:border-slate-400"
          >
            {BLOCKING_FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-[22px] border border-slate-200/80 bg-slate-50/70 p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold text-slate-900">新增 Issue</h4>
            <p className="mt-1 text-xs text-slate-500">手工补录的问题会直接进入统一 Issue Queue。</p>
          </div>
          <Button
            size="sm"
            onClick={() => void handleCreate()}
            disabled={creating || !title.trim() || !description.trim()}
          >
            {creating ? '创建中...' : '新增 Issue'}
          </Button>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <select
            value={type}
            onChange={(event) => setType(event.target.value as IssueUnitType)}
            className="h-12 rounded-[1.1rem] border border-slate-200 bg-white/72 px-4 text-sm text-slate-800 outline-none focus-visible:border-slate-400"
          >
            {ISSUE_UNIT_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={severity}
            onChange={(event) => setSeverity(event.target.value as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL')}
            className="h-12 rounded-[1.1rem] border border-slate-200 bg-white/72 px-4 text-sm text-slate-800 outline-none focus-visible:border-slate-400"
          >
            <option value="LOW">LOW</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="HIGH">HIGH</option>
            <option value="CRITICAL">CRITICAL</option>
          </select>
          <select
            value={primaryRequirementUnitId}
            onChange={(event) => setPrimaryRequirementUnitId(event.target.value)}
            className="h-12 rounded-[1.1rem] border border-slate-200 bg-white/72 px-4 text-sm text-slate-800 outline-none focus-visible:border-slate-400"
          >
            <option value="">不绑定 Requirement Unit</option>
            {unitOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.unitKey} · {item.title}
              </option>
            ))}
          </select>
        </div>
        <p className="text-xs text-slate-500">{getIssueTypeDescription(type)}</p>
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="例如：异常流程缺少短信发送失败处理"
        />
        <Textarea
          rows={4}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="描述当前问题、风险或待确认项。"
        />
        <Textarea
          rows={3}
          value={suggestedResolution}
          onChange={(event) => setSuggestedResolution(event.target.value)}
          placeholder="建议处理方式（可选）"
        />
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={blockDev}
            onChange={(event) => setBlockDev(event.target.checked)}
            className="h-4 w-4 rounded border-slate-300"
          />
          标记为阻断开发
        </label>
        {createError ? <p className="text-sm text-red-600">{createError}</p> : null}
      </div>

      {loading ? <p className="text-sm text-slate-400">加载 Issue Queue...</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {!loading && !error && items.length === 0 ? (
        <div className="rounded-[22px] border border-dashed border-slate-300 px-4 py-5 text-sm text-slate-500">
          当前还没有 Issue 或 Conflict 投影项。后续可继续从 Clarification、Conflict Scan 和人工补录沉淀问题对象。
        </div>
      ) : null}

      {!loading && !error && items.length > 0 && filteredItems.length === 0 ? (
        <div className="rounded-[22px] border border-dashed border-slate-300 px-4 py-5 text-sm text-slate-500">
          当前过滤条件下没有匹配的问题项。
        </div>
      ) : null}

      {!loading && !error && filteredItems.length > 0 ? (
        <ul className="space-y-3">
          {filteredItems.map((item) => {
            const clarificationQueueStatus = item.sourceType === 'clarification'
              ? buildClarificationQueueStatusMeta({
                  category: item.sourceCategory ?? 'OTHER',
                  clarificationStatus: item.sourceStatus ?? 'OPEN',
                  issueStatus: item.status,
                })
              : null

            return (
            <li key={item.id} className="rounded-[22px] border border-slate-200/80 bg-slate-50/70 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${ISSUE_UNIT_SEVERITY_CLASSES[item.severity]}`}>
                  风险 {ISSUE_UNIT_SEVERITY_LABELS[item.severity]}
                </span>
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
                  {ISSUE_UNIT_STATUS_LABELS[item.status] ?? item.status}
                </span>
                <span className="app-chip">{getIssueTypeLabel(item.type)}</span>
                <span className="app-chip">{item.sourceLabel}</span>
                {item.sourceCategoryLabel ? <span className="app-chip">{item.sourceCategoryLabel}</span> : null}
                {item.sourceStatusLabel ? <span className="app-chip">来源状态 {item.sourceStatusLabel}</span> : null}
                {item.queueKind === 'conflict' ? <span className="app-chip">投影项</span> : null}
                {item.blockDev ? (
                  <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700">
                    阻断开发
                  </span>
                ) : null}
                {clarificationQueueStatus?.callbackNeeded ? (
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
                    待 Clarification 回源确认
                  </span>
                ) : null}
                {item.lifecycle.requiresSourceFollowup ? (
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
                    需回到来源确认
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
                {item.queueKind === 'issue' ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateEditDraft(item.id, { open: !editDrafts[item.id]?.open })}
                  >
                    {editDrafts[item.id]?.open ? '收起编辑' : '编辑 Issue'}
                  </Button>
                ) : null}
              </div>

              {item.suggestedResolution ? (
                <p className="mt-3 text-xs leading-5 text-slate-500">
                  建议处理：{item.suggestedResolution}
                </p>
              ) : null}

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-[18px] border border-slate-200/70 bg-white/80 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">来源</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{item.lifecycle.sourceSummary}</p>
                </div>
                <div className="rounded-[18px] border border-slate-200/70 bg-white/80 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">当前影响</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{item.lifecycle.blockingSummary}</p>
                </div>
                <div className="rounded-[18px] border border-slate-200/70 bg-white/80 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">关闭含义</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{item.lifecycle.closeMeaning}</p>
                </div>
                <div className={`rounded-[18px] border p-3 ${
                  item.lifecycle.requiresSourceFollowup
                    ? 'border-amber-200 bg-amber-50/80'
                    : 'border-slate-200/70 bg-white/80'
                }`}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">回源确认</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{item.lifecycle.followupSummary}</p>
                </div>
              </div>

              {item.queueKind === 'issue' && editDrafts[item.id]?.open ? (
                <div className="mt-4 grid gap-3 rounded-[18px] border border-slate-200/70 bg-white/70 p-3">
                  <div className="grid gap-3 md:grid-cols-3">
                    <select
                      value={editDrafts[item.id]?.type ?? item.type}
                      onChange={(event) => updateEditDraft(item.id, { type: event.target.value as IssueUnitType })}
                      className="h-12 rounded-[1.1rem] border border-slate-200 bg-white/72 px-4 text-sm text-slate-800 outline-none focus-visible:border-slate-400"
                    >
                      {ISSUE_UNIT_TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <select
                      value={editDrafts[item.id]?.severity ?? item.severity}
                      onChange={(event) => updateEditDraft(item.id, { severity: event.target.value as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' })}
                      className="h-12 rounded-[1.1rem] border border-slate-200 bg-white/72 px-4 text-sm text-slate-800 outline-none focus-visible:border-slate-400"
                    >
                      <option value="LOW">LOW</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="HIGH">HIGH</option>
                      <option value="CRITICAL">CRITICAL</option>
                    </select>
                    <select
                      value={editDrafts[item.id]?.primaryRequirementUnitId ?? ''}
                      onChange={(event) => updateEditDraft(item.id, { primaryRequirementUnitId: event.target.value })}
                      className="h-12 rounded-[1.1rem] border border-slate-200 bg-white/72 px-4 text-sm text-slate-800 outline-none focus-visible:border-slate-400"
                    >
                      <option value="">不绑定 Requirement Unit</option>
                      {unitOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.unitKey} · {option.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Input
                    value={editDrafts[item.id]?.title ?? item.title}
                    onChange={(event) => updateEditDraft(item.id, { title: event.target.value })}
                    placeholder="标题"
                  />
                  <Textarea
                    rows={4}
                    value={editDrafts[item.id]?.description ?? item.description}
                    onChange={(event) => updateEditDraft(item.id, { description: event.target.value })}
                    placeholder="描述"
                  />
                  <Textarea
                    rows={3}
                    value={editDrafts[item.id]?.suggestedResolution ?? item.suggestedResolution ?? ''}
                    onChange={(event) => updateEditDraft(item.id, { suggestedResolution: event.target.value })}
                    placeholder="建议处理方式"
                  />
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={editDrafts[item.id]?.blockDev ?? item.blockDev}
                      onChange={(event) => updateEditDraft(item.id, { blockDev: event.target.checked })}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    标记为阻断开发
                  </label>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => void handleSaveEdit(item.entityId)}
                      disabled={editDrafts[item.id]?.saving}
                    >
                      {editDrafts[item.id]?.saving ? '保存中...' : '保存编辑'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateEditDraft(item.id, {
                        open: false,
                        type: ISSUE_UNIT_TYPE_OPTIONS.some((option) => option.value === item.type)
                          ? item.type as IssueUnitType
                          : 'ambiguity',
                        severity: item.severity,
                        title: item.title,
                        description: item.description,
                        blockDev: item.blockDev,
                        suggestedResolution: item.suggestedResolution ?? '',
                        primaryRequirementUnitId: item.primaryRequirementUnit?.id ?? '',
                        error: null,
                      })}
                    >
                      取消
                    </Button>
                  </div>
                  {editDrafts[item.id]?.error ? (
                    <p className="text-xs text-red-600">{editDrafts[item.id]?.error}</p>
                  ) : null}
                </div>
              ) : null}

              <div className="mt-4 grid gap-3 rounded-[18px] border border-slate-200/70 bg-white/70 p-3 md:grid-cols-[220px_120px]">
                <select
                  value={statusDrafts[item.id]?.status ?? item.status}
                  onChange={(event) => updateStatusDraft(item.id, { status: event.target.value })}
                  className="h-10 rounded-[1rem] border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus-visible:border-slate-400"
                >
                  {(item.queueKind === 'conflict' ? CONFLICT_STATUS_OPTIONS : ISSUE_UNIT_STATUS_OPTIONS).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void handleSaveStatus(item)}
                  disabled={statusDrafts[item.id]?.saving}
                >
                  {statusDrafts[item.id]?.saving ? '保存中...' : '保存状态'}
                </Button>
              </div>
              {item.queueKind === 'conflict' ? (
                <p className="mt-2 text-xs text-slate-500">
                  该项来自 Conflict Scan。默认建议在 Issue Queue 处理状态；关闭状态会同步回原 Conflict，对应证据仍保留在下方 Conflict Panel。
                </p>
              ) : null}
              {statusDrafts[item.id]?.error ? (
                <p className="mt-2 text-xs text-red-600">{statusDrafts[item.id].error}</p>
              ) : null}
            </li>
            )
          })}
        </ul>
      ) : null}
    </section>
  )
}
