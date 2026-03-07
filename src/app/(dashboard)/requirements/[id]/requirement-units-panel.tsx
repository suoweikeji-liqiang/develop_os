'use client'

// Primary location: Requirement detail now owns the main Requirement Units panel.

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ISSUE_UNIT_STATUS_LABELS,
  REQUIREMENT_UNIT_STATUS_LABELS,
  REQUIREMENT_UNIT_STATUS_OPTIONS,
  STABILITY_LABELS,
  STABILITY_OPTIONS,
} from '@/lib/requirement-evolution'
import {
  DEFAULT_REQUIREMENT_UNIT_LAYER,
  getRequirementUnitLayerGuidanceMessage,
  getRequirementUnitLayerProfile,
  getRequirementUnitProgressHint,
  getRequirementUnitTargetStabilityLabel,
  isRequirementUnitAtTarget,
  REQUIREMENT_UNIT_LAYER_OPTIONS,
} from '@/lib/requirement-unit-layer'
import type { ClarificationConclusionMeta } from '@/lib/issue-queue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
  clarificationSummary: {
    total: number
    activeIssueCount: number
    closedIssueCount: number
    callbackNeededCount: number
  }
  linkedClarifications: Array<{
    issueId: string
    questionId: string
    questionText: string
    category: string
    categoryLabel: string | null
    clarificationStatus: string
    clarificationStatusLabel: string | null
    issueStatus: string
    issueType: string
    callbackNeeded: boolean
    conclusionSignal: ClarificationConclusionMeta | null
    blockDev: boolean
    updatedAt: string
  }>
}

interface Props {
  requirementId: string
  hasModel: boolean
  summaryHighlights?: {
    affectedUnits: Array<{
      id: string
      reasons: string[]
    }>
    advanceUnits: Array<{
      id: string
      recommendation: string
    }>
    focusUnits: Array<{
      id: string
      recommendation: string
    }>
  }
  onDataChanged?: () => void
}

export function RequirementUnitsPanel({ requirementId, hasModel, summaryHighlights, onDataChanged }: Props) {
  const [items, setItems] = useState<RequirementUnitItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [bootstrapLoading, setBootstrapLoading] = useState(false)
  const [bootstrapMessage, setBootstrapMessage] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [summaryText, setSummaryText] = useState('')
  const [layer, setLayer] = useState(DEFAULT_REQUIREMENT_UNIT_LAYER)
  const [stabilityDrafts, setStabilityDrafts] = useState<Record<string, {
    level: string
    score: string
    reason: string
    status: string
    saving: boolean
    statusSaving: boolean
    error: string | null
  }>>({})
  const [editDrafts, setEditDrafts] = useState<Record<string, {
    title: string
    summary: string
    layer: string
    open: boolean
    saving: boolean
    error: string | null
  }>>({})

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
      setStabilityDrafts(Object.fromEntries(
        (Array.isArray(payload) ? payload : []).map((item) => [item.id, {
          level: item.stabilityLevel,
          score: item.stabilityScore !== null ? String(item.stabilityScore) : '',
          reason: item.stabilityReason ?? '',
          status: item.status,
          saving: false,
          statusSaving: false,
          error: null,
        }]),
      ))
      setEditDrafts(Object.fromEntries(
        (Array.isArray(payload) ? payload : []).map((item) => [item.id, {
          title: item.title,
          summary: item.summary,
          layer: item.layer,
          open: false,
          saving: false,
          error: null,
        }]),
      ))
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
    const atTargetCount = items.filter((item) => isRequirementUnitAtTarget(item.layer, item.stabilityLevel)).length

    return {
      total: items.length,
      readyCount,
      atTargetCount,
    }
  }, [items])

  const affectedUnitReasonMap = useMemo(() => new Map(
    (summaryHighlights?.affectedUnits ?? []).map((item) => [item.id, item.reasons]),
  ), [summaryHighlights?.affectedUnits])

  const advanceUnitRecommendationMap = useMemo(() => new Map(
    (summaryHighlights?.advanceUnits ?? []).map((item) => [item.id, item.recommendation]),
  ), [summaryHighlights?.advanceUnits])

  const focusUnitRecommendationMap = useMemo(() => new Map(
    (summaryHighlights?.focusUnits ?? []).map((item) => [item.id, item.recommendation]),
  ), [summaryHighlights?.focusUnits])

  async function handleCreate() {
    if (!title.trim() || !summaryText.trim() || !layer.trim()) return

    setCreating(true)
    setCreateError(null)

    try {
      const res = await fetch('/api/trpc/requirementUnit.create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requirementId,
          title: title.trim(),
          summary: summaryText.trim(),
          layer: layer.trim(),
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error?.message ?? '创建 Requirement Unit 失败')
      }

      setTitle('')
      setSummaryText('')
      setLayer(DEFAULT_REQUIREMENT_UNIT_LAYER)
      await loadItems()
      onDataChanged?.()
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : '创建 Requirement Unit 失败')
    } finally {
      setCreating(false)
    }
  }

  async function handleBootstrap() {
    setBootstrapLoading(true)
    setBootstrapMessage(null)

    try {
      const res = await fetch('/api/trpc/requirementUnit.bootstrapFromModel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requirementId }),
      })
      const data = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(data?.error?.message ?? '从模型初始化 Requirement Units 失败')
      }

      const payload = data?.result?.data?.json ?? data?.result?.data
      setBootstrapMessage(`已创建 ${payload?.created ?? 0} 个，跳过 ${payload?.skipped ?? 0} 个重复单元。`)
      await loadItems()
      onDataChanged?.()
    } catch (err) {
      setBootstrapMessage(err instanceof Error ? err.message : '从模型初始化 Requirement Units 失败')
    } finally {
      setBootstrapLoading(false)
    }
  }

  function updateDraft(
    id: string,
    patch: Partial<{ level: string; score: string; reason: string; status: string; saving: boolean; statusSaving: boolean; error: string | null }>,
  ) {
    setStabilityDrafts((prev) => ({
      ...prev,
      [id]: {
        level: prev[id]?.level ?? 'S0_IDEA',
        score: prev[id]?.score ?? '',
        reason: prev[id]?.reason ?? '',
        status: prev[id]?.status ?? 'DRAFT',
        saving: prev[id]?.saving ?? false,
        statusSaving: prev[id]?.statusSaving ?? false,
        error: prev[id]?.error ?? null,
        ...patch,
      },
    }))
  }

  function updateEditDraft(
    id: string,
    patch: Partial<{ title: string; summary: string; layer: string; open: boolean; saving: boolean; error: string | null }>,
  ) {
    setEditDrafts((prev) => ({
      ...prev,
      [id]: {
        title: prev[id]?.title ?? '',
        summary: prev[id]?.summary ?? '',
        layer: prev[id]?.layer ?? DEFAULT_REQUIREMENT_UNIT_LAYER,
        open: prev[id]?.open ?? false,
        saving: prev[id]?.saving ?? false,
        error: prev[id]?.error ?? null,
        ...patch,
      },
    }))
  }

  async function handleSaveStability(id: string) {
    const draft = stabilityDrafts[id]
    if (!draft) return

    updateDraft(id, { saving: true, error: null })

    try {
      const res = await fetch('/api/trpc/requirementUnit.updateStability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requirementUnitId: id,
          stabilityLevel: draft.level,
          stabilityScore: draft.score.trim() ? Number(draft.score) : null,
          stabilityReason: draft.reason.trim() || null,
        }),
      })
      const data = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(data?.error?.message ?? '更新 Requirement Unit 稳定度失败')
      }

      await loadItems()
      onDataChanged?.()
    } catch (err) {
      updateDraft(id, {
        saving: false,
        error: err instanceof Error ? err.message : '更新 Requirement Unit 稳定度失败',
      })
      return
    }

    updateDraft(id, { saving: false, error: null })
  }

  async function handleSaveStatus(id: string) {
    const draft = stabilityDrafts[id]
    if (!draft) return

    updateDraft(id, { statusSaving: true, error: null })

    try {
      const res = await fetch('/api/trpc/requirementUnit.updateStatus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requirementUnitId: id,
          status: draft.status,
        }),
      })
      const data = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(data?.error?.message ?? '更新 Requirement Unit 状态失败')
      }

      await loadItems()
      onDataChanged?.()
    } catch (err) {
      updateDraft(id, {
        statusSaving: false,
        error: err instanceof Error ? err.message : '更新 Requirement Unit 状态失败',
      })
      return
    }

    updateDraft(id, { statusSaving: false, error: null })
  }

  async function handleSaveEdit(id: string) {
    const draft = editDrafts[id]
    if (!draft || !draft.title.trim() || !draft.summary.trim() || !draft.layer.trim()) return

    updateEditDraft(id, { saving: true, error: null })

    try {
      const res = await fetch('/api/trpc/requirementUnit.update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requirementUnitId: id,
          title: draft.title.trim(),
          summary: draft.summary.trim(),
          layer: draft.layer.trim(),
        }),
      })
      const data = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(data?.error?.message ?? '更新 Requirement Unit 失败')
      }

      await loadItems()
      onDataChanged?.()
      updateEditDraft(id, { open: false, saving: false, error: null })
    } catch (err) {
      updateEditDraft(id, {
        saving: false,
        error: err instanceof Error ? err.message : '更新 Requirement Unit 失败',
      })
    }
  }

  return (
    <section className="app-panel p-4 sm:p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-600">Requirement Units</h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Requirement 负责顶层边界，Requirement Unit 负责颗粒推进。这里承载单元拆分、单元状态与单元稳定度。
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="app-chip">总数 {summary.total}</span>
          <span className="app-chip">达目标 {summary.atTargetCount}</span>
          <span className="app-chip">可开发 {summary.readyCount}</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void handleBootstrap()}
            disabled={!hasModel || bootstrapLoading}
          >
            {bootstrapLoading ? '初始化中...' : '从 ModelCard 初始化'}
          </Button>
        </div>
      </div>
      {bootstrapMessage ? <p className="text-sm text-slate-600">{bootstrapMessage}</p> : null}

      <div className="rounded-[22px] border border-slate-200/80 bg-slate-50/70 p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h4 className="text-sm font-semibold text-slate-900">新增 Requirement Unit</h4>
          <Button size="sm" onClick={() => void handleCreate()} disabled={creating || !title.trim() || !summaryText.trim()}>
            {creating ? '创建中...' : '新增 Unit'}
          </Button>
        </div>
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_160px]">
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="例如：用户注册主流程"
          />
          <select
            value={layer}
            onChange={(event) => setLayer(event.target.value as typeof layer)}
            className="h-12 rounded-[1.1rem] border border-slate-200 bg-white/72 px-4 text-sm text-slate-800 outline-none focus-visible:border-slate-400"
          >
            {REQUIREMENT_UNIT_LAYER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <Textarea
          rows={4}
          value={summaryText}
          onChange={(event) => setSummaryText(event.target.value)}
          placeholder="简述这个需求单元的目标、边界或需要被持续追踪的内容。"
        />
        {createError ? <p className="text-sm text-red-600">{createError}</p> : null}
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
          {items.map((item) => {
            const layerProfile = getRequirementUnitLayerProfile(item.layer)
            const meetsTarget = isRequirementUnitAtTarget(item.layer, item.stabilityLevel)
            const progressHint = getRequirementUnitProgressHint({
              layer: item.layer,
              stabilityLevel: item.stabilityLevel,
              status: item.status,
            })
            const affectedReasons = affectedUnitReasonMap.get(item.id) ?? []
            const advanceRecommendation = advanceUnitRecommendationMap.get(item.id)
            const focusRecommendation = focusUnitRecommendationMap.get(item.id)

            return (
              <li key={item.id} className="rounded-[22px] border border-slate-200/80 bg-slate-50/70 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="app-chip">{item.unitKey}</span>
                  <span className="app-chip">{layerProfile.label}</span>
                  <span className="app-chip">目标 {getRequirementUnitTargetStabilityLabel(item.layer)}</span>
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
                    {REQUIREMENT_UNIT_STATUS_LABELS[item.status] ?? item.status}
                  </span>
                  <StabilityBadge level={item.stabilityLevel} />
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    meetsTarget
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {meetsTarget ? '已达本层目标' : '低于本层目标'}
                  </span>
                </div>

                <div className="mt-3">
                  <h4 className="text-sm font-semibold text-slate-900">{item.title}</h4>
                  <p className="mt-1 text-sm leading-6 text-slate-600 whitespace-pre-wrap">{item.summary}</p>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                  <span className="app-chip">关联问题 {item._count.issueUnits}</span>
                  <span className="app-chip">子单元 {item._count.childUnits}</span>
                  {item.clarificationSummary.total > 0 ? (
                    <span className="app-chip">来源澄清 {item.clarificationSummary.total}</span>
                  ) : null}
                  {item.clarificationSummary.callbackNeededCount > 0 ? (
                    <span className="app-chip text-amber-700">待回源 {item.clarificationSummary.callbackNeededCount}</span>
                  ) : null}
                  {item.stabilityScore !== null ? <span className="app-chip">稳定度分 {item.stabilityScore}</span> : null}
                  {item.ownerId ? <span className="app-chip">Owner {item.ownerId}</span> : null}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateEditDraft(item.id, { open: !editDrafts[item.id]?.open })}
                  >
                    {editDrafts[item.id]?.open ? '收起编辑' : '编辑 Unit'}
                  </Button>
                </div>

                <p className="mt-3 text-xs leading-5 text-slate-500">
                  分层说明：{layerProfile.description} 推荐目标 {STABILITY_LABELS[layerProfile.targetStabilityLevel]}。
                  {getRequirementUnitLayerGuidanceMessage(item.layer, item.stabilityLevel)}
                </p>

                <div className={`mt-3 rounded-[16px] border px-3 py-3 text-sm ${
                  progressHint.kind === 'advance'
                    ? 'border-emerald-200 bg-emerald-50/80 text-emerald-800'
                    : 'border-amber-200 bg-amber-50/80 text-amber-800'
                }`}>
                  <p className="font-semibold">{progressHint.label}</p>
                  <p className="mt-1 leading-6">{progressHint.message}</p>
                </div>

                {focusRecommendation ? (
                  <div className="mt-3 rounded-[16px] border border-amber-200 bg-amber-50/80 px-3 py-3 text-sm text-amber-800">
                    <p className="font-semibold">Impact Summary 当前建议优先补齐该 Unit</p>
                    <p className="mt-1 leading-6">{focusRecommendation}</p>
                    {affectedReasons.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        {affectedReasons.map((reason) => (
                          <span key={`${item.id}-${reason}`} className="app-chip text-amber-800">
                            {reason}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : advanceRecommendation ? (
                  <div className="mt-3 rounded-[16px] border border-emerald-200 bg-emerald-50/80 px-3 py-3 text-sm text-emerald-800">
                    <p className="font-semibold">Impact Summary 当前建议优先推进该 Unit</p>
                    <p className="mt-1 leading-6">{advanceRecommendation}</p>
                    {affectedReasons.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        {affectedReasons.map((reason) => (
                          <span key={`${item.id}-${reason}`} className="app-chip text-emerald-800">
                            {reason}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : affectedReasons.length > 0 ? (
                  <div className="mt-3 rounded-[16px] border border-slate-200/80 bg-white/80 px-3 py-3 text-sm text-slate-700">
                    <p className="font-semibold text-slate-900">Impact Summary 当前把该 Unit 视为受影响单元</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
                      {affectedReasons.map((reason) => (
                        <span key={`${item.id}-${reason}`} className="app-chip">
                          {reason}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                {item.linkedClarifications.length > 0 ? (
                  <div className="mt-3 rounded-[16px] border border-slate-200/80 bg-white/80 px-3 py-3 text-sm text-slate-700">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-900">Clarification 回链</p>
                      <span className="app-chip">活跃 {item.clarificationSummary.activeIssueCount}</span>
                      <span className="app-chip">已关闭 {item.clarificationSummary.closedIssueCount}</span>
                    </div>
                    <p className="mt-2 leading-6 text-slate-600">
                      这些 Clarification 来源问题已经直接回链到当前 Requirement Unit。Issue Queue 中的问题关闭后，请回到这里确认该 Unit 的状态与稳定度是否可以继续推进。
                    </p>
                    <div className="mt-3 space-y-2">
                      {item.linkedClarifications.map((clarification) => (
                        <div key={clarification.issueId} className="rounded-[14px] border border-slate-200/80 bg-slate-50/80 px-3 py-3">
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            {clarification.categoryLabel ? <span className="app-chip">{clarification.categoryLabel}</span> : null}
                            <span className="app-chip">
                              Clarification {clarification.clarificationStatusLabel ?? clarification.clarificationStatus}
                            </span>
                            <span className="app-chip">
                              Issue {ISSUE_UNIT_STATUS_LABELS[clarification.issueStatus as keyof typeof ISSUE_UNIT_STATUS_LABELS] ?? clarification.issueStatus}
                            </span>
                            {clarification.blockDev ? <span className="app-chip text-red-700">阻断推进</span> : null}
                            {clarification.callbackNeeded ? <span className="app-chip text-amber-700">待回源确认</span> : null}
                          </div>
                          <p className="mt-2 text-sm leading-6 text-slate-700">{clarification.questionText}</p>
                          {clarification.conclusionSignal ? (
                            <div className={`mt-2 rounded-[12px] border px-3 py-3 text-sm ${
                              clarification.conclusionSignal.requiresManualContentUpdate
                                ? 'border-amber-200 bg-amber-50/80 text-amber-800'
                                : 'border-sky-200 bg-sky-50/80 text-sky-800'
                            }`}>
                              <div className="flex flex-wrap gap-2 text-xs">
                                <span className="app-chip">{clarification.conclusionSignal.label}</span>
                                <span className="app-chip">{clarification.conclusionSignal.effectLabel}</span>
                                <span className={`app-chip ${clarification.conclusionSignal.requiresManualContentUpdate ? 'text-amber-700' : ''}`}>
                                  {clarification.conclusionSignal.sinkLabel}
                                </span>
                              </div>
                              <p className="mt-2 leading-6">{clarification.conclusionSignal.summary}</p>
                              <p className="mt-2 text-xs leading-5">{clarification.conclusionSignal.nextStep}</p>
                            </div>
                          ) : null}
                          <div className="mt-2 flex flex-wrap gap-2 text-xs">
                            <a
                              href="#issue-queue"
                              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-slate-600 hover:bg-slate-50"
                            >
                              回到 Issue Queue
                            </a>
                            {clarification.callbackNeeded ? (
                              <span className="text-amber-700">
                                当前应先确认澄清是否已收敛，再决定是否上调该 Unit。
                              </span>
                            ) : (
                              <span className="text-slate-500">
                                结论会优先沉淀到当前 Unit，而不是回到 Requirement 顶层。
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {item.stabilityReason ? (
                  <p className="mt-3 text-xs leading-5 text-slate-500">
                    稳定度说明：{item.stabilityReason}
                  </p>
                ) : null}

                {editDrafts[item.id]?.open ? (
                  <div className="mt-4 grid gap-3 rounded-[18px] border border-slate-200/70 bg-white/70 p-3">
                    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_160px]">
                      <Input
                        value={editDrafts[item.id]?.title ?? item.title}
                        onChange={(event) => updateEditDraft(item.id, { title: event.target.value })}
                        placeholder="标题"
                      />
                      <select
                        value={editDrafts[item.id]?.layer ?? item.layer}
                        onChange={(event) => updateEditDraft(item.id, { layer: event.target.value })}
                        className="h-12 rounded-[1.1rem] border border-slate-200 bg-white/72 px-4 text-sm text-slate-800 outline-none focus-visible:border-slate-400"
                      >
                        {REQUIREMENT_UNIT_LAYER_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <Textarea
                      rows={4}
                      value={editDrafts[item.id]?.summary ?? item.summary}
                      onChange={(event) => updateEditDraft(item.id, { summary: event.target.value })}
                      placeholder="摘要"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => void handleSaveEdit(item.id)}
                        disabled={editDrafts[item.id]?.saving}
                      >
                        {editDrafts[item.id]?.saving ? '保存中...' : '保存编辑'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateEditDraft(item.id, {
                          open: false,
                          title: item.title,
                          summary: item.summary,
                          layer: item.layer,
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

                <div className="mt-4 grid gap-3 rounded-[18px] border border-slate-200/70 bg-white/70 p-3">
                  <div className="grid gap-3 md:grid-cols-[220px_120px]">
                    <select
                      value={stabilityDrafts[item.id]?.status ?? item.status}
                      onChange={(event) => updateDraft(item.id, { status: event.target.value })}
                      className="h-10 rounded-[1rem] border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus-visible:border-slate-400"
                    >
                      {REQUIREMENT_UNIT_STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void handleSaveStatus(item.id)}
                      disabled={stabilityDrafts[item.id]?.statusSaving}
                    >
                      {stabilityDrafts[item.id]?.statusSaving ? '保存中...' : '保存状态'}
                    </Button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-[180px_120px_minmax(0,1fr)_120px]">
                    <select
                      value={stabilityDrafts[item.id]?.level ?? item.stabilityLevel}
                      onChange={(event) => updateDraft(item.id, { level: event.target.value })}
                      className="h-10 rounded-[1rem] border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus-visible:border-slate-400"
                    >
                      {STABILITY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <Input
                      value={stabilityDrafts[item.id]?.score ?? ''}
                      onChange={(event) => updateDraft(item.id, { score: event.target.value })}
                      placeholder="分数"
                      inputMode="numeric"
                    />
                    <Input
                      value={stabilityDrafts[item.id]?.reason ?? ''}
                      onChange={(event) => updateDraft(item.id, { reason: event.target.value })}
                      placeholder="稳定度说明"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void handleSaveStability(item.id)}
                      disabled={stabilityDrafts[item.id]?.saving}
                    >
                      {stabilityDrafts[item.id]?.saving ? '保存中...' : '保存稳定度'}
                    </Button>
                  </div>
                  {stabilityDrafts[item.id]?.error ? (
                    <p className="text-xs text-red-600">{stabilityDrafts[item.id].error}</p>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>
      ) : null}
    </section>
  )
}
