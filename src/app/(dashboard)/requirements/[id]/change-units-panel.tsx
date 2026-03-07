'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CHANGE_UNIT_RISK_CLASSES,
  CHANGE_UNIT_RISK_LABELS,
  CHANGE_UNIT_RISK_OPTIONS,
  CHANGE_UNIT_STATUS_CLASSES,
  CHANGE_UNIT_STATUS_LABELS,
  CHANGE_UNIT_STATUS_OPTIONS,
} from '@/lib/requirement-evolution'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

interface ChangeUnitItem {
  id: string
  changeKey: string
  title: string
  reason: string
  changeScope: string | null
  impactSummary: string | null
  riskLevel: keyof typeof CHANGE_UNIT_RISK_LABELS
  requiresResignoff: boolean
  affectsTests: boolean
  affectsPrototype: boolean
  affectsCode: boolean
  status: keyof typeof CHANGE_UNIT_STATUS_LABELS
  appliedAt: string | null
  updatedAt: string
  linkedRequirementVersionCount: number
  linkedModelChangeLogCount: number
  latestAppliedTrace: {
    kind: 'version' | 'modelChangeLog'
    label: string
    changeSource: string
    createdAt: string
  } | null
  requirementUnits: Array<{
    id: string
    unitKey: string
    title: string
  }>
  issueUnits: Array<{
    id: string
    title: string
    severity: string
    blockDev: boolean
  }>
  impactHints: string[]
}

interface Props {
  requirementId: string
  refreshToken?: number
  onDataChanged?: () => void
}

interface EditDraft {
  title: string
  reason: string
  changeScope: string
  impactSummary: string
  riskLevel: keyof typeof CHANGE_UNIT_RISK_LABELS
  requiresResignoff: boolean
  affectsTests: boolean
  affectsPrototype: boolean
  affectsCode: boolean
  requirementUnitIds: string[]
  issueUnitIds: string[]
  open: boolean
  saving: boolean
  error: string | null
}

export function ChangeUnitsPanel({ requirementId, refreshToken = 0, onDataChanged }: Props) {
  const [items, setItems] = useState<ChangeUnitItem[]>([])
  const [unitOptions, setUnitOptions] = useState<Array<{ id: string; unitKey: string; title: string }>>([])
  const [issueOptions, setIssueOptions] = useState<Array<{ id: string; title: string; severity: string; blockDev: boolean }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [reason, setReason] = useState('')
  const [changeScope, setChangeScope] = useState('')
  const [impactSummary, setImpactSummary] = useState('')
  const [riskLevel, setRiskLevel] = useState<keyof typeof CHANGE_UNIT_RISK_LABELS>('MEDIUM')
  const [requiresResignoff, setRequiresResignoff] = useState(false)
  const [affectsTests, setAffectsTests] = useState(false)
  const [affectsPrototype, setAffectsPrototype] = useState(false)
  const [affectsCode, setAffectsCode] = useState(false)
  const [selectedRequirementUnitIds, setSelectedRequirementUnitIds] = useState<string[]>([])
  const [selectedIssueUnitIds, setSelectedIssueUnitIds] = useState<string[]>([])
  const [statusDrafts, setStatusDrafts] = useState<Record<string, {
    status: keyof typeof CHANGE_UNIT_STATUS_LABELS
    saving: boolean
    error: string | null
  }>>({})
  const [editDrafts, setEditDrafts] = useState<Record<string, EditDraft>>({})

  const loadItems = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const input = encodeURIComponent(JSON.stringify({ requirementId }))
      const res = await fetch(`/api/trpc/changeUnit.listByRequirement?input=${input}`)
      if (!res.ok) throw new Error('加载 Requirement Change Queue 失败')
      const data = await res.json()
      const payload = (data.result?.data?.json ?? data.result?.data ?? []) as ChangeUnitItem[]
      const safePayload = Array.isArray(payload) ? payload : []
      setItems(safePayload)
      setStatusDrafts(Object.fromEntries(
        safePayload.map((item) => [item.id, {
          status: item.status,
          saving: false,
          error: null,
        }]),
      ))
      setEditDrafts(Object.fromEntries(
        safePayload.map((item) => [item.id, {
          title: item.title,
          reason: item.reason,
          changeScope: item.changeScope ?? '',
          impactSummary: item.impactSummary ?? '',
          riskLevel: item.riskLevel,
          requiresResignoff: item.requiresResignoff,
          affectsTests: item.affectsTests,
          affectsPrototype: item.affectsPrototype,
          affectsCode: item.affectsCode,
          requirementUnitIds: item.requirementUnits.map((unit) => unit.id),
          issueUnitIds: item.issueUnits.map((issue) => issue.id),
          open: false,
          saving: false,
          error: null,
        }]),
      ))
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载 Requirement Change Queue 失败')
    } finally {
      setLoading(false)
    }
  }, [requirementId])

  const loadOptions = useCallback(async () => {
    try {
      const input = encodeURIComponent(JSON.stringify({ requirementId }))
      const [unitRes, issueRes] = await Promise.all([
        fetch(`/api/trpc/requirementUnit.listByRequirement?input=${input}`),
        fetch(`/api/trpc/issueUnit.listByRequirement?input=${input}`),
      ])

      if (unitRes.ok) {
        const unitData = await unitRes.json()
        const unitPayload = (unitData.result?.data?.json ?? unitData.result?.data ?? []) as Array<{
          id: string
          unitKey: string
          title: string
        }>
        setUnitOptions(Array.isArray(unitPayload) ? unitPayload : [])
      } else {
        setUnitOptions([])
      }

      if (issueRes.ok) {
        const issueData = await issueRes.json()
        const issuePayload = (issueData.result?.data?.json ?? issueData.result?.data ?? []) as Array<{
          entityId: string
          queueKind: 'issue' | 'conflict'
          title: string
          severity: string
          blockDev: boolean
        }>
        setIssueOptions(Array.isArray(issuePayload)
          ? issuePayload
            .filter((item) => item.queueKind === 'issue')
            .map((item) => ({
              id: item.entityId,
              title: item.title,
              severity: item.severity,
              blockDev: item.blockDev,
            }))
          : [])
      } else {
        setIssueOptions([])
      }
    } catch {
      setUnitOptions([])
      setIssueOptions([])
    }
  }, [requirementId])

  useEffect(() => {
    void loadItems()
    void loadOptions()
  }, [loadItems, loadOptions, refreshToken])

  const summary = useMemo(() => ({
    total: items.length,
    open: items.filter((item) => item.status === 'PROPOSED' || item.status === 'UNDER_REVIEW' || item.status === 'APPROVED').length,
    highRisk: items.filter((item) => (
      (item.riskLevel === 'HIGH' || item.riskLevel === 'CRITICAL')
      && item.status !== 'REJECTED'
      && item.status !== 'APPLIED'
      && item.status !== 'ARCHIVED'
    )).length,
    resignoff: items.filter((item) => item.requiresResignoff && item.status !== 'REJECTED' && item.status !== 'ARCHIVED').length,
  }), [items])

  function toggleId(list: string[], id: string) {
    return list.includes(id) ? list.filter((item) => item !== id) : [...list, id]
  }

  function updateStatusDraft(id: string, patch: Partial<{ status: keyof typeof CHANGE_UNIT_STATUS_LABELS; saving: boolean; error: string | null }>) {
    setStatusDrafts((prev) => ({
      ...prev,
      [id]: {
        status: prev[id]?.status ?? 'PROPOSED',
        saving: prev[id]?.saving ?? false,
        error: prev[id]?.error ?? null,
        ...patch,
      },
    }))
  }

  function updateEditDraft(id: string, patch: Partial<EditDraft>) {
    setEditDrafts((prev) => ({
      ...prev,
      [id]: {
        title: prev[id]?.title ?? '',
        reason: prev[id]?.reason ?? '',
        changeScope: prev[id]?.changeScope ?? '',
        impactSummary: prev[id]?.impactSummary ?? '',
        riskLevel: prev[id]?.riskLevel ?? 'MEDIUM',
        requiresResignoff: prev[id]?.requiresResignoff ?? false,
        affectsTests: prev[id]?.affectsTests ?? false,
        affectsPrototype: prev[id]?.affectsPrototype ?? false,
        affectsCode: prev[id]?.affectsCode ?? false,
        requirementUnitIds: prev[id]?.requirementUnitIds ?? [],
        issueUnitIds: prev[id]?.issueUnitIds ?? [],
        open: prev[id]?.open ?? false,
        saving: prev[id]?.saving ?? false,
        error: prev[id]?.error ?? null,
        ...patch,
      },
    }))
  }

  async function handleCreate() {
    if (!title.trim() || !reason.trim()) return

    setCreating(true)
    setCreateError(null)

    try {
      const res = await fetch('/api/trpc/changeUnit.create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requirementId,
          title: title.trim(),
          reason: reason.trim(),
          changeScope: changeScope.trim() || undefined,
          impactSummary: impactSummary.trim() || undefined,
          riskLevel,
          requiresResignoff,
          affectsTests,
          affectsPrototype,
          affectsCode,
          requirementUnitIds: selectedRequirementUnitIds,
          issueUnitIds: selectedIssueUnitIds,
        }),
      })
      const data = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(data?.error?.message ?? '创建 Change Unit 失败')
      }

      setTitle('')
      setReason('')
      setChangeScope('')
      setImpactSummary('')
      setRiskLevel('MEDIUM')
      setRequiresResignoff(false)
      setAffectsTests(false)
      setAffectsPrototype(false)
      setAffectsCode(false)
      setSelectedRequirementUnitIds([])
      setSelectedIssueUnitIds([])
      await loadItems()
      onDataChanged?.()
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : '创建 Change Unit 失败')
    } finally {
      setCreating(false)
    }
  }

  async function handleSaveStatus(id: string) {
    const draft = statusDrafts[id]
    if (!draft) return

    updateStatusDraft(id, { saving: true, error: null })

    try {
      const res = await fetch('/api/trpc/changeUnit.updateStatus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          changeUnitId: id,
          status: draft.status,
        }),
      })
      const data = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(data?.error?.message ?? '更新 Change 状态失败')
      }

      await loadItems()
      onDataChanged?.()
    } catch (err) {
      updateStatusDraft(id, {
        saving: false,
        error: err instanceof Error ? err.message : '更新 Change 状态失败',
      })
      return
    }

    updateStatusDraft(id, { saving: false, error: null })
  }

  async function handleSaveEdit(id: string) {
    const draft = editDrafts[id]
    if (!draft || !draft.title.trim() || !draft.reason.trim()) return

    updateEditDraft(id, { saving: true, error: null })

    try {
      const res = await fetch('/api/trpc/changeUnit.update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          changeUnitId: id,
          title: draft.title.trim(),
          reason: draft.reason.trim(),
          changeScope: draft.changeScope.trim() || null,
          impactSummary: draft.impactSummary.trim() || null,
          riskLevel: draft.riskLevel,
          requiresResignoff: draft.requiresResignoff,
          affectsTests: draft.affectsTests,
          affectsPrototype: draft.affectsPrototype,
          affectsCode: draft.affectsCode,
          requirementUnitIds: draft.requirementUnitIds,
          issueUnitIds: draft.issueUnitIds,
        }),
      })
      const data = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(data?.error?.message ?? '更新 Change Unit 失败')
      }

      await loadItems()
      onDataChanged?.()
    } catch (err) {
      updateEditDraft(id, {
        saving: false,
        error: err instanceof Error ? err.message : '更新 Change Unit 失败',
      })
      return
    }

    updateEditDraft(id, { saving: false, error: null, open: false })
  }

  return (
    <section className="app-panel p-4 sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-600">Requirement Change Queue</h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            把已确认的问题收敛成 Requirement 变更对象，明确原因、影响范围和是否需要重新评审。
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-slate-500">
          <span className="app-chip">Changes {summary.total}</span>
          <span className="app-chip">Open {summary.open}</span>
          <span className={`app-chip ${summary.highRisk > 0 ? 'text-red-700' : ''}`}>High Risk {summary.highRisk}</span>
          <span className={`app-chip ${summary.resignoff > 0 ? 'text-orange-700' : ''}`}>Re-signoff {summary.resignoff}</span>
        </div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="变更标题" />
        <select
          value={riskLevel}
          onChange={(event) => setRiskLevel(event.target.value as keyof typeof CHANGE_UNIT_RISK_LABELS)}
          className="h-12 rounded-[1.1rem] border border-slate-200 bg-white/72 px-4 text-sm text-slate-800 outline-none focus-visible:border-slate-400"
        >
          {CHANGE_UNIT_RISK_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <Textarea
          rows={3}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="为什么需要这次变更"
          className="lg:col-span-2"
        />
        <Textarea
          rows={2}
          value={changeScope}
          onChange={(event) => setChangeScope(event.target.value)}
          placeholder="变更范围"
        />
        <Textarea
          rows={2}
          value={impactSummary}
          onChange={(event) => setImpactSummary(event.target.value)}
          placeholder="影响摘要"
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="rounded-[20px] border border-slate-200/80 bg-slate-50/80 p-3">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">影响标记</p>
          <div className="mt-3 space-y-2 text-sm text-slate-700">
            <label className="flex items-center gap-2"><input type="checkbox" checked={requiresResignoff} onChange={(event) => setRequiresResignoff(event.target.checked)} /> 需要重新 signoff</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={affectsTests} onChange={(event) => setAffectsTests(event.target.checked)} /> 影响测试</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={affectsPrototype} onChange={(event) => setAffectsPrototype(event.target.checked)} /> 影响原型</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={affectsCode} onChange={(event) => setAffectsCode(event.target.checked)} /> 影响代码</label>
          </div>
        </div>
        <div className="rounded-[20px] border border-slate-200/80 bg-slate-50/80 p-3">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">关联 Requirement Units</p>
          <div className="mt-3 max-h-40 space-y-2 overflow-auto text-sm text-slate-700">
            {unitOptions.length === 0 ? <p className="text-slate-400">暂无可关联单元</p> : unitOptions.map((item) => (
              <label key={item.id} className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={selectedRequirementUnitIds.includes(item.id)}
                  onChange={() => setSelectedRequirementUnitIds((prev) => toggleId(prev, item.id))}
                />
                <span>{item.unitKey} · {item.title}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="rounded-[20px] border border-slate-200/80 bg-slate-50/80 p-3">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">来源 Issue Units</p>
          <div className="mt-3 max-h-40 space-y-2 overflow-auto text-sm text-slate-700">
            {issueOptions.length === 0 ? <p className="text-slate-400">暂无可关联问题</p> : issueOptions.map((item) => (
              <label key={item.id} className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={selectedIssueUnitIds.includes(item.id)}
                  onChange={() => setSelectedIssueUnitIds((prev) => toggleId(prev, item.id))}
                />
                <span>{item.title}{item.blockDev ? ' · Blocking' : ''}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Button onClick={handleCreate} disabled={creating}>
          {creating ? '创建中...' : '新增变更'}
        </Button>
        {createError ? <p className="text-sm text-red-600">{createError}</p> : null}
      </div>

      {loading ? <p className="mt-5 text-sm text-slate-400">加载 Requirement Change Queue...</p> : null}
      {error ? <p className="mt-5 text-sm text-red-600">{error}</p> : null}

      {!loading && !error && items.length === 0 ? (
        <div className="mt-5 rounded-[24px] border border-dashed border-slate-300/80 bg-slate-50/80 p-5 text-sm text-slate-500">
          Requirement 还没有正式变更对象。先在 Issue Queue 中定位问题，再把需要正式推进的项收敛到变更队列。
        </div>
      ) : null}

      <div className="mt-5 space-y-4">
        {items.map((item) => {
          const draft = editDrafts[item.id]
          const statusDraft = statusDrafts[item.id]

          return (
            <article key={item.id} className="rounded-[24px] border border-slate-200/80 bg-white/80 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="app-chip">{item.changeKey}</span>
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${CHANGE_UNIT_STATUS_CLASSES[item.status]}`}>
                      {CHANGE_UNIT_STATUS_LABELS[item.status]}
                    </span>
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${CHANGE_UNIT_RISK_CLASSES[item.riskLevel]}`}>
                      {CHANGE_UNIT_RISK_LABELS[item.riskLevel]}
                    </span>
                    {item.requiresResignoff ? <span className="app-chip text-orange-700">Re-signoff</span> : null}
                    {item.affectsTests ? <span className="app-chip">影响测试</span> : null}
                    {item.affectsPrototype ? <span className="app-chip">影响原型</span> : null}
                    {item.affectsCode ? <span className="app-chip">影响代码</span> : null}
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-slate-950">{item.title}</h4>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{item.reason}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={statusDraft?.status ?? item.status}
                    onChange={(event) => updateStatusDraft(item.id, { status: event.target.value as keyof typeof CHANGE_UNIT_STATUS_LABELS })}
                    className="h-10 rounded-full border border-slate-200 bg-white px-4 text-sm text-slate-700"
                  >
                    {CHANGE_UNIT_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <Button size="sm" variant="outline" onClick={() => void handleSaveStatus(item.id)} disabled={statusDraft?.saving}>
                    {statusDraft?.saving ? '保存中...' : '保存状态'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => updateEditDraft(item.id, { open: !draft?.open })}>
                    {draft?.open ? '收起编辑' : '编辑'}
                  </Button>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
                <span className="app-chip">Units {item.requirementUnits.length}</span>
                <span className="app-chip">Issues {item.issueUnits.length}</span>
                <span className="app-chip">Versions {item.linkedRequirementVersionCount}</span>
                <span className="app-chip">Model Logs {item.linkedModelChangeLogCount}</span>
                {item.appliedAt ? <span className="app-chip">Applied {new Date(item.appliedAt).toLocaleDateString('zh-CN')}</span> : null}
                <span className="app-chip">更新于 {new Date(item.updatedAt).toLocaleDateString('zh-CN')}</span>
              </div>

              {item.changeScope ? <p className="mt-3 text-sm text-slate-600">范围：{item.changeScope}</p> : null}
              {item.impactSummary ? <p className="mt-2 text-sm text-slate-600">影响：{item.impactSummary}</p> : null}
              {item.impactHints.length > 0 ? (
                <p className="mt-2 text-sm text-slate-500">提示：{item.impactHints.join('，')}</p>
              ) : null}
              <p className="mt-2 text-sm text-slate-500">
                {item.latestAppliedTrace
                  ? `落地痕迹：${item.latestAppliedTrace.kind === 'version' ? item.latestAppliedTrace.label : `模型日志 ${item.latestAppliedTrace.label}`} · ${new Date(item.latestAppliedTrace.createdAt).toLocaleDateString('zh-CN')}`
                  : '落地痕迹：尚未发现关联的版本或模型变更'}
              </p>

              {item.requirementUnits.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.requirementUnits.map((unit) => (
                    <span key={unit.id} className="app-chip">
                      {unit.unitKey} · {unit.title}
                    </span>
                  ))}
                </div>
              ) : null}

              {item.issueUnits.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.issueUnits.map((issue) => (
                    <span key={issue.id} className={`app-chip ${issue.blockDev ? 'text-red-700' : ''}`}>
                      {issue.title}
                    </span>
                  ))}
                </div>
              ) : null}

              {statusDraft?.error ? <p className="mt-3 text-xs text-red-600">{statusDraft.error}</p> : null}

              {draft?.open ? (
                <div className="mt-4 space-y-3 rounded-[20px] border border-slate-200/80 bg-slate-50/70 p-4">
                  <div className="grid gap-3 lg:grid-cols-2">
                    <Input value={draft.title} onChange={(event) => updateEditDraft(item.id, { title: event.target.value })} placeholder="变更标题" />
                    <select
                      value={draft.riskLevel}
                      onChange={(event) => updateEditDraft(item.id, { riskLevel: event.target.value as keyof typeof CHANGE_UNIT_RISK_LABELS })}
                      className="h-12 rounded-[1.1rem] border border-slate-200 bg-white/72 px-4 text-sm text-slate-800 outline-none focus-visible:border-slate-400"
                    >
                      {CHANGE_UNIT_RISK_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <Textarea
                      rows={3}
                      value={draft.reason}
                      onChange={(event) => updateEditDraft(item.id, { reason: event.target.value })}
                      placeholder="变更原因"
                      className="lg:col-span-2"
                    />
                    <Textarea
                      rows={2}
                      value={draft.changeScope}
                      onChange={(event) => updateEditDraft(item.id, { changeScope: event.target.value })}
                      placeholder="变更范围"
                    />
                    <Textarea
                      rows={2}
                      value={draft.impactSummary}
                      onChange={(event) => updateEditDraft(item.id, { impactSummary: event.target.value })}
                      placeholder="影响摘要"
                    />
                  </div>

                  <div className="grid gap-4 lg:grid-cols-3">
                    <div className="space-y-2 text-sm text-slate-700">
                      <label className="flex items-center gap-2"><input type="checkbox" checked={draft.requiresResignoff} onChange={(event) => updateEditDraft(item.id, { requiresResignoff: event.target.checked })} /> 需要重新 signoff</label>
                      <label className="flex items-center gap-2"><input type="checkbox" checked={draft.affectsTests} onChange={(event) => updateEditDraft(item.id, { affectsTests: event.target.checked })} /> 影响测试</label>
                      <label className="flex items-center gap-2"><input type="checkbox" checked={draft.affectsPrototype} onChange={(event) => updateEditDraft(item.id, { affectsPrototype: event.target.checked })} /> 影响原型</label>
                      <label className="flex items-center gap-2"><input type="checkbox" checked={draft.affectsCode} onChange={(event) => updateEditDraft(item.id, { affectsCode: event.target.checked })} /> 影响代码</label>
                    </div>
                    <div className="max-h-40 space-y-2 overflow-auto text-sm text-slate-700">
                      {unitOptions.map((option) => (
                        <label key={option.id} className="flex items-start gap-2">
                          <input
                            type="checkbox"
                            checked={draft.requirementUnitIds.includes(option.id)}
                            onChange={() => updateEditDraft(item.id, {
                              requirementUnitIds: toggleId(draft.requirementUnitIds, option.id),
                            })}
                          />
                          <span>{option.unitKey} · {option.title}</span>
                        </label>
                      ))}
                    </div>
                    <div className="max-h-40 space-y-2 overflow-auto text-sm text-slate-700">
                      {issueOptions.map((option) => (
                        <label key={option.id} className="flex items-start gap-2">
                          <input
                            type="checkbox"
                            checked={draft.issueUnitIds.includes(option.id)}
                            onChange={() => updateEditDraft(item.id, {
                              issueUnitIds: toggleId(draft.issueUnitIds, option.id),
                            })}
                          />
                          <span>{option.title}{option.blockDev ? ' · Blocking' : ''}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Button size="sm" onClick={() => void handleSaveEdit(item.id)} disabled={draft.saving}>
                      {draft.saving ? '保存中...' : '保存变更'}
                    </Button>
                    {draft.error ? <p className="text-xs text-red-600">{draft.error}</p> : null}
                  </div>
                </div>
              ) : null}
            </article>
          )
        })}
      </div>
    </section>
  )
}
