'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import {
  BookOpenText,
  GitBranch,
  Layers3,
  MessagesSquare,
  Radar,
  Undo2,
} from 'lucide-react'
import { ModelTabs } from './model-tabs'
import { RoleViewTabs } from './role-view-tabs'
import { SignoffPanel } from './signoff-panel'
import { ConsensusStatus } from './consensus-status'
import { ChatPanel } from './chat-panel'
import { VersionHistory } from './version-history'
import { StatusControl } from './status-control'
import { ConflictPanel } from './conflict-panel'
import { TestCasePanel } from './test-case-panel'
import { RequirementUnitsPanel } from './requirement-units-panel'
import { IssueUnitsPanel } from './issue-units-panel'
import { ChangeUnitsPanel } from './change-units-panel'
import { StabilityBadge } from './stability-badge'
import type { FiveLayerModel } from '@/lib/schemas/requirement'
import type { ConversationResponse } from '@/lib/schemas/conversation'
import type { UIMessage } from 'ai'
import type { PendingAssumption } from './assumption-card'
import { canManageRequirementWorkflow } from '@/lib/workflow/permissions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { STABILITY_OPTIONS } from '@/lib/requirement-evolution'

interface Props {
  requirementId: string
  title: string
  status: string
  stabilityLevel: string | null
  stabilityScore: number | null
  stabilityReason: string | null
  version: number
  rawInput: string
  initialModel: FiveLayerModel | undefined
  initialConfidence: Record<string, number> | undefined
  initialCitations: unknown[] | undefined
  initialMessages: UIMessage[]
  userRoles: string[]
  isAdmin: boolean
}

interface CitationItem {
  chunkId: string
  sourceName: string
  sourceType: 'document' | 'code' | 'history'
  excerpt: string
}

interface GateHint {
  level: 'warning' | 'critical'
  message: string
}

const MODELCARD_SECTIONS = [
  'Core Abstraction',
  'Variables / Relationships',
  'Visual Concept Map',
  'Assumptions',
  'Limitations / Boundary',
  'Contradictions',
  'Migration Attempts',
  'Evolution Timeline',
] as const

function getExplorationStage(status: string): 'open' | 'refining' | 'stabilized' {
  if (status === 'DONE') return 'stabilized'
  if (status === 'DRAFT') return 'open'
  return 'refining'
}

function getStageClasses(stage: 'open' | 'refining' | 'stabilized'): string {
  if (stage === 'open') return 'border-amber-300 bg-amber-50 text-amber-700'
  if (stage === 'stabilized') return 'border-emerald-300 bg-emerald-50 text-emerald-700'
  return 'border-blue-300 bg-blue-50 text-blue-700'
}

function getStageCopy(stage: 'open' | 'refining' | 'stabilized'): string {
  if (stage === 'open') return '需求仍在采样与抽象阶段，适合多做澄清与发散探索。'
  if (stage === 'stabilized') return '需求已接近稳定，可重点关注收尾、签字与沉淀。'
  return '需求已经进入修正与收敛阶段，适合持续对话和冲突扫描。'
}

export function ExplorationDetailClient({
  requirementId,
  title,
  status,
  stabilityLevel,
  stabilityScore,
  stabilityReason,
  version,
  rawInput,
  initialModel,
  initialConfidence,
  initialCitations,
  initialMessages,
  userRoles,
  isAdmin,
}: Props) {
  const [currentStatus, setCurrentStatus] = useState(status)
  const [currentStabilityLevel, setCurrentStabilityLevel] = useState(stabilityLevel)
  const [currentStabilityScore, setCurrentStabilityScore] = useState(stabilityScore)
  const [currentStabilityReason, setCurrentStabilityReason] = useState(stabilityReason ?? '')
  const [stabilitySaving, setStabilitySaving] = useState(false)
  const [stabilityError, setStabilityError] = useState<string | null>(null)
  const [model, setModel] = useState<FiveLayerModel | undefined>(initialModel)
  const [pendingPatches, setPendingPatches] = useState<ConversationResponse['patches'] | null>(null)
  const [pendingAssumptions, setPendingAssumptions] = useState<PendingAssumption[]>([])
  const [showUndo, setShowUndo] = useState(false)
  const [showVersionHistory, setShowVersionHistory] = useState(false)
  const [signoffRefreshToken, setSignoffRefreshToken] = useState(0)
  const [signoffInvalidationToken, setSignoffInvalidationToken] = useState(0)
  const [issueRefreshToken, setIssueRefreshToken] = useState(0)
  const [changeRefreshToken, setChangeRefreshToken] = useState(0)
  const [structureLoading, setStructureLoading] = useState(false)
  const [structureError, setStructureError] = useState<string | null>(null)
  const [completeness, setCompleteness] = useState<{ score: number; missingFields: string[] } | null>(null)
  const [clarificationSession, setClarificationSession] = useState<{
    id: string
    questions: Array<{
      id: string
      category: string
      status: string
      questionText: string
      answerText?: string | null
    }>
  } | null>(null)
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({})
  const [clarificationIssueState, setClarificationIssueState] = useState<Record<string, {
    loading: boolean
    message: string | null
  }>>({})
  const [changeOptions, setChangeOptions] = useState<Array<{
    id: string
    changeKey: string
    title: string
    status: string
  }>>([])
  const [activeChangeUnitId, setActiveChangeUnitId] = useState('')
  const [gateHints, setGateHints] = useState<GateHint[]>([])
  const [specMarkdown, setSpecMarkdown] = useState('')
  const [specLoading, setSpecLoading] = useState(false)
  const previousModelRef = useRef<FiveLayerModel | null>(null)
  const citations = (initialCitations ?? []) as CitationItem[]
  const explorationStage = getExplorationStage(currentStatus)
  const canManageWorkflow = canManageRequirementWorkflow({ roles: userRoles, isAdmin })

  const persistModel = useCallback(async (
    nextModel: FiveLayerModel,
    changeSource: 'manual' | 'ai-converse' | 'assumption' = 'manual',
  ) => {
    try {
      await fetch('/api/trpc/requirement.updateModel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: requirementId,
          model: nextModel,
          changeSource,
          changeUnitId: activeChangeUnitId || undefined,
        }),
      })
      if (activeChangeUnitId) {
        setChangeRefreshToken((prev) => prev + 1)
      }
    } catch {
      // Keep optimistic UI state even if persistence fails.
    }
  }, [activeChangeUnitId, requirementId])

  const invalidateSignoffs = useCallback(() => {
    if (currentStatus !== 'IN_REVIEW') return
    setSignoffInvalidationToken((prev) => prev + 1)
  }, [currentStatus])

  const handlePatchProposed = useCallback((response: ConversationResponse) => {
    if (response.patches) {
      setPendingPatches(response.patches)
    }
    if (response.newAssumptions?.length) {
      setPendingAssumptions(prev => [
        ...prev,
        ...response.newAssumptions!.map(a => ({
          id: crypto.randomUUID(),
          ...a,
        })),
      ])
    }
  }, [])

  const handleLayerUpdate = useCallback((layer: string, data: Record<string, unknown>) => {
    setModel((prev) => {
      if (!prev) return prev
      const updated = { ...prev, [layer]: data } as FiveLayerModel
      void persistModel(updated)
      return updated
    })
    invalidateSignoffs()
  }, [invalidateSignoffs, persistModel])

  const handleApplyPatch = useCallback(async (layer: string, proposedData: unknown) => {
    previousModelRef.current = model ?? null
    setShowUndo(true)
    const updatedModel = model ? { ...model, [layer]: proposedData } as FiveLayerModel : undefined
    setModel(updatedModel)
    if (updatedModel) {
      await persistModel(updatedModel, 'ai-converse')
      invalidateSignoffs()
    }
    setPendingPatches(prev => {
      if (!prev) return null
      const next = { ...prev }
      delete next[layer as keyof typeof next]
      return Object.keys(next).length === 0 ? null : next
    })
  }, [invalidateSignoffs, model, persistModel])

  const handleRejectPatch = useCallback((layer: string) => {
    setPendingPatches(prev => {
      if (!prev) return null
      const next = { ...prev }
      delete next[layer as keyof typeof next]
      return Object.keys(next).length === 0 ? null : next
    })
  }, [])

  function handleUndo() {
    if (previousModelRef.current) {
      setModel(previousModelRef.current)
      previousModelRef.current = null
      setShowUndo(false)
    }
  }

  const handleAssumptionAction = useCallback(async (
    id: string,
    action: { type: 'accept' | 'reject'; finalContent?: string; rejectReason?: string },
  ) => {
    if (action.type === 'accept') {
      const assumption = pendingAssumptions.find(a => a.id === id)
      if (assumption && model) {
        const currentItems = (model.assumption?.items as Array<{ content: string; confidence: string; rationale: string }>) ?? []
        const updatedModel = {
          ...model,
          assumption: {
            ...model.assumption,
            items: [...currentItems, {
              content: action.finalContent ?? assumption.content,
              confidence: assumption.confidence,
              rationale: assumption.rationale,
            }],
          },
        } as FiveLayerModel
        setModel(updatedModel)
        await persistModel(updatedModel, 'assumption')
        invalidateSignoffs()
      }
    }
    setPendingAssumptions(prev => prev.filter(a => a.id !== id))
  }, [invalidateSignoffs, model, pendingAssumptions, persistModel])

  const refreshClarification = useCallback(async () => {
    try {
      const res = await fetch('/api/trpc/clarification.list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requirementId }),
      })
      if (!res.ok) return
      const data = await res.json() as {
        result?: {
          data?: {
            id: string
            questions: Array<{
              id: string
              category: string
              status: string
              questionText: string
              answerText?: string | null
            }>
          } | null
        }
      }
      setClarificationSession(data.result?.data ?? null)
    } catch {
      // degrade silently
    }
  }, [requirementId])

  const refreshCompleteness = useCallback(async () => {
    try {
      const res = await fetch('/api/trpc/requirement.getCompleteness', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requirementId }),
      })
      if (!res.ok) return
      const data = await res.json() as {
        result?: {
          data?: { score: number; missingFields: string[] }
        }
      }
      if (data.result?.data) setCompleteness(data.result.data)
    } catch {
      // degrade silently
    }
  }, [requirementId])

  const refreshChangeOptions = useCallback(async () => {
    try {
      const input = encodeURIComponent(JSON.stringify({ requirementId }))
      const res = await fetch(`/api/trpc/changeUnit.listByRequirement?input=${input}`)
      if (!res.ok) return
      const data = await res.json() as {
        result?: {
          data?: {
            json?: Array<{ id: string; changeKey: string; title: string; status: string }>
          } | Array<{ id: string; changeKey: string; title: string; status: string }>
        }
      }
      const payload = (data.result?.data && typeof data.result.data === 'object' && 'json' in data.result.data
        ? data.result.data.json
        : data.result?.data ?? []) as Array<{ id: string; changeKey: string; title: string; status: string }>
      const next = Array.isArray(payload)
        ? payload.map((item) => ({
            id: item.id,
            changeKey: item.changeKey,
            title: item.title,
            status: item.status,
          }))
        : []
      setChangeOptions(next)
      if (activeChangeUnitId && !next.some((item) => item.id === activeChangeUnitId)) {
        setActiveChangeUnitId('')
      }
    } catch {
      setChangeOptions([])
    }
  }, [activeChangeUnitId, requirementId])

  const refreshGateHints = useCallback(async () => {
    try {
      const input = encodeURIComponent(JSON.stringify({ requirementId }))
      const res = await fetch(`/api/trpc/requirement.getGateHints?input=${input}`)
      if (!res.ok) return
      const data = await res.json() as {
        result?: {
          data?: {
            json?: { hints?: GateHint[] }
          } | { hints?: GateHint[] }
        }
      }
      const payload = (data.result?.data && typeof data.result.data === 'object' && 'json' in data.result.data
        ? data.result.data.json
        : data.result?.data ?? {}) as { hints?: GateHint[] }
      setGateHints(Array.isArray(payload.hints) ? payload.hints : [])
    } catch {
      setGateHints([])
    }
  }, [requirementId])

  useEffect(() => {
    void refreshClarification()
    void refreshCompleteness()
    void refreshChangeOptions()
    void refreshGateHints()
  }, [
    changeRefreshToken,
    issueRefreshToken,
    refreshChangeOptions,
    refreshClarification,
    refreshCompleteness,
    refreshGateHints,
  ])

  async function handleStructure() {
    setStructureLoading(true)
    setStructureError(null)
    try {
      const res = await fetch('/api/trpc/requirement.structureFromRawInput', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requirementId }),
      })
      if (!res.ok) throw new Error('结构化失败')
      const data = await res.json() as {
        result?: {
          data?: {
            model?: FiveLayerModel
            completeness?: { score: number; missingFields: string[] }
          }
        }
      }
      if (data.result?.data?.model) setModel(data.result.data.model)
      if (data.result?.data?.completeness) setCompleteness(data.result.data.completeness)
      await refreshClarification()
    } catch (error) {
      setStructureError(error instanceof Error ? error.message : '结构化失败')
    } finally {
      setStructureLoading(false)
    }
  }

  async function handleAnswerQuestion(questionId: string) {
    const answerText = answerDrafts[questionId]?.trim()
    if (!answerText) return

    try {
      const res = await fetch('/api/trpc/clarification.answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId,
          answerText,
          changeUnitId: activeChangeUnitId || undefined,
        }),
      })
      if (!res.ok) throw new Error('回答失败')
      const data = await res.json() as {
        result?: {
          data?: { model?: FiveLayerModel }
        }
      }
      if (data.result?.data?.model) {
        setModel(data.result.data.model)
      }

      setAnswerDrafts((prev) => ({ ...prev, [questionId]: '' }))
      if (activeChangeUnitId) {
        setChangeRefreshToken((prev) => prev + 1)
      }
      await Promise.all([refreshClarification(), refreshCompleteness()])
    } catch {
      // degrade silently
    }
  }

  async function handleGenerateSpec() {
    setSpecLoading(true)
    try {
      const res = await fetch('/api/trpc/requirement.generateSpec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requirementId }),
      })
      if (!res.ok) throw new Error('Spec 生成失败')
      const data = await res.json() as {
        result?: {
          data?: { spec?: string }
        }
      }
      if (data.result?.data?.spec) {
        setSpecMarkdown(data.result.data.spec)
      }
    } finally {
      setSpecLoading(false)
    }
  }

  async function handleCreateClarificationIssue(questionId: string) {
    setClarificationIssueState((prev) => ({
      ...prev,
      [questionId]: { loading: true, message: null },
    }))

    try {
      const res = await fetch('/api/trpc/clarification.createIssue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId }),
      })
      const data = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(data?.error?.message ?? '从澄清问题创建 Issue 失败')
      }

      const payload = data?.result?.data?.json ?? data?.result?.data
      setClarificationIssueState((prev) => ({
        ...prev,
        [questionId]: {
          loading: false,
          message: payload?.created ? '已转为 Issue Unit' : '该澄清问题已存在 Issue Unit',
        },
      }))
      setIssueRefreshToken((prev) => prev + 1)
      void refreshGateHints()
    } catch (error) {
      setClarificationIssueState((prev) => ({
        ...prev,
        [questionId]: {
          loading: false,
          message: error instanceof Error ? error.message : '从澄清问题创建 Issue 失败',
        },
      }))
    }
  }

  async function handleSaveRequirementStability() {
    if (!currentStabilityLevel) return

    setStabilitySaving(true)
    setStabilityError(null)

    try {
      const res = await fetch('/api/trpc/requirement.updateStability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requirementId,
          stabilityLevel: currentStabilityLevel,
          stabilityScore: currentStabilityScore === null || currentStabilityScore === undefined || Number.isNaN(currentStabilityScore)
            ? null
            : currentStabilityScore,
          stabilityReason: currentStabilityReason.trim() || null,
        }),
      })

      const data = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(data?.error?.message ?? '更新需求稳定度失败')
      }

      const payload = data?.result?.data?.json ?? data?.result?.data
      setCurrentStabilityLevel(payload?.stabilityLevel ?? currentStabilityLevel)
      setCurrentStabilityScore(payload?.stabilityScore ?? null)
      setCurrentStabilityReason(payload?.stabilityReason ?? '')
    } catch (error) {
      setStabilityError(error instanceof Error ? error.message : '更新需求稳定度失败')
    } finally {
      setStabilitySaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="app-panel-dark surface-grid relative overflow-hidden px-6 py-7 sm:px-8 sm:py-8">
        <div className="absolute right-[-5rem] top-[-4rem] h-48 w-48 rounded-full bg-cyan-400/18 blur-3xl" />
        <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_360px]">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="app-chip-dark">Exploration</span>
              <span className={`rounded-full border px-3 py-1 font-medium ${getStageClasses(explorationStage)}`}>
                {explorationStage}
              </span>
              <span className="app-chip-dark">Status {currentStatus}</span>
              <StabilityBadge level={currentStabilityLevel} />
              <span className="app-chip-dark">v{version}</span>
            </div>

            <div className="space-y-3">
              <h1 className="app-display text-4xl font-semibold leading-none text-white sm:text-5xl">
                {title}
              </h1>
              <p className="max-w-2xl text-base leading-7 text-white/70">
                {getStageCopy(explorationStage)}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="app-metric">
                <MessagesSquare className="size-5 text-cyan-200" />
                <p className="mt-3 text-sm font-semibold text-white">Dialogue</p>
                <p className="mt-2 text-sm text-white/58">{initialMessages.length} 条上下文对话</p>
              </div>
              <div className="app-metric">
                <Layers3 className="size-5 text-cyan-200" />
                <p className="mt-3 text-sm font-semibold text-white">Model state</p>
                <p className="mt-2 text-sm text-white/58">{model ? '已生成 ModelCard' : '等待结构化生成'}</p>
              </div>
              <div className="app-metric">
                <Radar className="size-5 text-cyan-200" />
                <p className="mt-3 text-sm font-semibold text-white">Knowledge refs</p>
                <p className="mt-2 text-sm text-white/58">{citations.length} 条上下文引用</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {model && (
                <button
                  onClick={() => setShowVersionHistory(prev => !prev)}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium ${
                    showVersionHistory
                      ? 'border-white/10 bg-white/10 text-white'
                      : 'border-white/15 bg-white/7 text-white/75 hover:bg-white/12'
                  }`}
                >
                  <GitBranch className="size-4" />
                  {showVersionHistory ? '隐藏版本历史' : '查看版本历史'}
                </button>
              )}
              {showUndo && (
                <button
                  onClick={handleUndo}
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/7 px-4 py-2.5 text-sm font-medium text-white/75 hover:bg-white/12"
                >
                  <Undo2 className="size-4" />
                  撤销上次变更
                </button>
              )}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/7 p-5 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-sm font-medium text-white/80">
              <BookOpenText className="size-4 text-cyan-200" />
              Exploration Context
            </div>
            <p className="mt-4 max-h-72 overflow-auto whitespace-pre-wrap text-sm leading-6 text-white/68">
              {rawInput}
            </p>
          </div>
        </div>
      </section>

      <section className="app-panel p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="app-kicker">Workflow status</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">推进当前探索阶段</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {isAdmin && (
              <span className="app-chip">ADMIN</span>
            )}
            {userRoles.length > 0 ? (
              userRoles.map((role) => (
                <span key={role} className="app-chip">
                  {role}
                </span>
              ))
            ) : !isAdmin ? (
              <span className="app-chip">Observer</span>
            ) : null}
          </div>
        </div>
        <div className="mt-5">
          <StatusControl
            requirementId={requirementId}
            currentStatus={currentStatus}
            canManageWorkflow={canManageWorkflow}
            onStatusChanged={setCurrentStatus}
          />
        </div>
        {gateHints.length > 0 ? (
          <div className="mt-4 space-y-2">
            {gateHints.map((hint, index) => (
              <div
                key={`${hint.level}-${index}`}
                className={`rounded-[18px] border px-4 py-3 text-sm ${
                  hint.level === 'critical'
                    ? 'border-red-200 bg-red-50 text-red-700'
                    : 'border-amber-200 bg-amber-50 text-amber-700'
                }`}
              >
                {hint.message}
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <section className="app-panel p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="app-kicker">Requirement Evolution</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">需求演化对象入口</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              保持现有需求澄清主链不变，在当前详情页逐步接入稳定度、Requirement Units、Issue Queue 和 Change Queue。
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StabilityBadge level={currentStabilityLevel} />
            {currentStabilityScore !== null ? <span className="app-chip">稳定度分 {currentStabilityScore}</span> : null}
          </div>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-[220px_120px_minmax(0,1fr)_120px]">
          <select
            value={currentStabilityLevel ?? 'S0_IDEA'}
            onChange={(event) => setCurrentStabilityLevel(event.target.value)}
            className="h-12 rounded-[1.1rem] border border-slate-200 bg-white/72 px-4 text-sm text-slate-800 outline-none focus-visible:border-slate-400"
          >
            {STABILITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <Input
            value={currentStabilityScore ?? ''}
            onChange={(event) => {
              const next = event.target.value
              setCurrentStabilityScore(next.trim() === '' ? null : Number(next))
            }}
            placeholder="分数"
            inputMode="numeric"
          />
          <Textarea
            rows={2}
            value={currentStabilityReason}
            onChange={(event) => setCurrentStabilityReason(event.target.value)}
            placeholder="记录当前稳定度判断依据"
          />
          <Button onClick={handleSaveRequirementStability} disabled={stabilitySaving}>
            {stabilitySaving ? '保存中...' : '保存稳定度'}
          </Button>
        </div>
        {stabilityError ? (
          <p className="mt-3 text-sm text-red-600">{stabilityError}</p>
        ) : null}
        <div className="mt-3 text-sm text-slate-600">
          {currentStabilityReason || '当前已支持手动维护 Requirement 稳定度；规则化判断仍在后续阶段。'}
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
          <select
            value={activeChangeUnitId}
            onChange={(event) => setActiveChangeUnitId(event.target.value)}
            className="h-12 rounded-[1.1rem] border border-slate-200 bg-white/72 px-4 text-sm text-slate-800 outline-none focus-visible:border-slate-400"
          >
            <option value="">当前模型修改不关联 Change</option>
            {changeOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.changeKey} · {item.title} · {item.status}
              </option>
            ))}
          </select>
          <div className="rounded-[1.1rem] border border-slate-200/80 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
            当前模型修改上下文。选择后，本页中的手动模型更新、对话修正和澄清回填会尽量关联到对应 Change。
          </div>
        </div>
      </section>

      {showVersionHistory && model && (
        <VersionHistory
          requirementId={requirementId}
          currentVersion={version}
          refreshToken={changeRefreshToken}
        />
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <section className="space-y-4">
          <div className="app-panel p-4 sm:p-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-600">
              Exploration Workspace
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              在这里用对话挑战假设、消化上下文、推动结构化抽象持续迭代。
            </p>
          </div>
          {model ? (
            <ChatPanel
              requirementId={requirementId}
              currentModel={model}
              initialMessages={initialMessages}
              autoOpen={initialMessages.length > 0}
              onPatchProposed={handlePatchProposed}
              hasPendingDiff={pendingPatches !== null}
            />
          ) : (
            <div className="app-panel border-dashed p-5 text-sm text-slate-500">
              ModelCard is being generated. Dialogue is enabled after the first abstraction pass.
            </div>
          )}
          <ConflictPanel requirementId={requirementId} hasModel={Boolean(model)} />
          <RequirementUnitsPanel requirementId={requirementId} hasModel={Boolean(model)} />
          <IssueUnitsPanel
            requirementId={requirementId}
            refreshToken={issueRefreshToken}
            onDataChanged={() => setIssueRefreshToken((prev) => prev + 1)}
          />
          <ChangeUnitsPanel
            requirementId={requirementId}
            refreshToken={changeRefreshToken}
            onDataChanged={() => {
              setChangeRefreshToken((prev) => prev + 1)
              void refreshGateHints()
            }}
          />
          <section className="app-panel p-4 sm:p-5 space-y-4">
            <details open>
              <summary className="cursor-pointer text-sm font-semibold uppercase tracking-[0.22em] text-slate-600">结构化区块</summary>
              <div className="mt-3 space-y-3">
                <Button onClick={handleStructure} disabled={structureLoading}>
                  {structureLoading ? '结构化中...' : '自动结构化'}
                </Button>
                {structureError && <p className="text-sm text-red-500">{structureError}</p>}
                <p className="text-sm text-slate-600">完成度：{completeness?.score ?? '-'} / 100</p>
                {completeness?.missingFields?.length ? (
                  <p className="text-xs text-slate-500">缺失字段：{completeness.missingFields.join(', ')}</p>
                ) : null}
              </div>
            </details>
          </section>

          <section className="app-panel p-4 sm:p-5 space-y-4">
            <details>
              <summary className="cursor-pointer text-sm font-semibold uppercase tracking-[0.22em] text-slate-600">澄清区块</summary>
              <div className="mt-3 space-y-4">
                <Button variant="outline" onClick={refreshClarification}>刷新问题队列</Button>
                {(clarificationSession?.questions ?? []).map((question) => (
                  <div key={question.id} className="rounded-md border p-3 space-y-2">
                    <p className="text-xs text-slate-500">[{question.category}] {question.status}</p>
                    <p className="text-sm text-slate-800">{question.questionText}</p>
                    <Textarea
                      placeholder="输入回答..."
                      value={answerDrafts[question.id] ?? ''}
                      onChange={(event) => setAnswerDrafts((prev) => ({ ...prev, [question.id]: event.target.value }))}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleAnswerQuestion(question.id)}>提交</Button>
                      {question.status !== 'RESOLVED' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void handleCreateClarificationIssue(question.id)}
                          disabled={clarificationIssueState[question.id]?.loading}
                        >
                          {clarificationIssueState[question.id]?.loading ? '转换中...' : '转为 Issue'}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          await fetch('/api/trpc/clarification.updateQuestionStatus', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ questionId: question.id, status: 'SKIPPED' }),
                          })
                          await refreshClarification()
                        }}
                      >
                        跳过
                      </Button>
                    </div>
                    {clarificationIssueState[question.id]?.message ? (
                      <p className="text-xs text-slate-500">{clarificationIssueState[question.id]?.message}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </details>
          </section>

          <section className="app-panel p-4 sm:p-5 space-y-4">
            <details>
              <summary className="cursor-pointer text-sm font-semibold uppercase tracking-[0.22em] text-slate-600">Spec 区块</summary>
              <div className="mt-3 space-y-3">
                <Button onClick={handleGenerateSpec} disabled={specLoading}>
                  {specLoading ? '生成中...' : '生成 Spec'}
                </Button>
                <Textarea rows={14} value={specMarkdown} readOnly placeholder="未生成 Spec" />
              </div>
            </details>
          </section>
          <TestCasePanel requirementId={requirementId} requirementTitle={title} hasModel={Boolean(model)} />
          <ConsensusStatus
            requirementId={requirementId}
            currentStatus={currentStatus}
            refreshToken={signoffRefreshToken}
            invalidationToken={signoffInvalidationToken}
          />
          <SignoffPanel
            requirementId={requirementId}
            userRoles={userRoles}
            currentStatus={currentStatus}
            refreshToken={signoffRefreshToken}
            invalidationToken={signoffInvalidationToken}
            onSignoffSubmitted={() => setSignoffRefreshToken((prev) => prev + 1)}
          />
        </section>

        <aside className="space-y-4 lg:sticky lg:top-24">
          <section className="app-panel space-y-4 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-600">ModelCard</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  结构化抽象资产，承载需求当前可复用的认知状态。
                </p>
              </div>
              <div className="app-chip">v{version}</div>
            </div>
            <div className="grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
              {MODELCARD_SECTIONS.map((section) => (
                <div key={section} className="rounded-[18px] border border-slate-200/80 bg-slate-50/80 px-3 py-2">
                  {section}
                </div>
              ))}
            </div>
            {model ? (
              <RoleViewTabs
                requirementId={requirementId}
                model={model}
                userRoles={userRoles}
                confidence={initialConfidence}
                pendingPatches={pendingPatches as Record<string, unknown> | null}
                pendingAssumptions={pendingAssumptions}
                readOnly={false}
                onApplyPatch={handleApplyPatch}
                onRejectPatch={handleRejectPatch}
                onUpdate={handleLayerUpdate}
                onAssumptionAction={handleAssumptionAction}
              />
            ) : (
              <ModelTabs
                requirementId={requirementId}
                rawInput={rawInput}
                initialModel={model}
                initialConfidence={initialConfidence}
                mode="generate"
                pendingPatches={pendingPatches}
                pendingAssumptions={pendingAssumptions}
                onApplyPatch={handleApplyPatch}
                onRejectPatch={handleRejectPatch}
                onAssumptionAction={handleAssumptionAction}
              />
            )}
          </section>

          {citations.length > 0 && (
            <section className="app-panel p-4 sm:p-5">
              <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-600">
                ModelCard Sources
              </h3>
              <p className="mt-2 text-xs leading-6 text-slate-500">
                支撑当前结构化抽象的知识来源与引用片段。
              </p>
              <ul className="mt-4 space-y-2">
                {citations.map((citation) => (
                  <li key={citation.chunkId} className="rounded-[20px] border border-slate-200/80 bg-slate-50/80 p-3 text-sm">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="font-medium text-slate-900">{citation.sourceName}</span>
                      <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] capitalize text-slate-500">
                        {citation.sourceType}
                      </span>
                    </div>
                    <p className="line-clamp-3 text-xs leading-5 text-slate-500">{citation.excerpt}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  )
}
