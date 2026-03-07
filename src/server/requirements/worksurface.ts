import {
  STABILITY_LABELS,
  type RequirementStabilityLevel,
  type RequirementUnitStatus,
} from '@/lib/requirement-evolution'
import {
  DEFAULT_REQUIREMENT_UNIT_TARGET_STABILITY_LEVEL,
  getRequirementUnitProgressHint,
  getRequirementUnitLayerProfile,
} from '@/lib/requirement-unit-layer'
import { buildIssuePriorityContext, buildIssuePriorityMeta, getIssueTypeLabel } from '@/lib/issue-queue'
import { STATUS_LABELS } from '@/lib/workflow/status-labels'
import type { RequirementStatus } from '@/lib/workflow/status-machine'

// Legacy default fallback for callers that still expect a single unit target line.
// Actual Requirement Unit maturity evaluation is now layer-aware.
export const TARGET_REQUIREMENT_UNIT_STABILITY_LEVEL: RequirementStabilityLevel = DEFAULT_REQUIREMENT_UNIT_TARGET_STABILITY_LEVEL
export const LOW_REQUIREMENT_STABILITY_LEVELS = ['S0_IDEA', 'S1_ROUGHLY_DEFINED'] as const satisfies readonly RequirementStabilityLevel[]

const STABILITY_ORDER: Record<RequirementStabilityLevel, number> = {
  S0_IDEA: 0,
  S1_ROUGHLY_DEFINED: 1,
  S2_MAIN_FLOW_CLEAR: 2,
  S3_ALMOST_READY: 3,
  S4_READY_FOR_DEVELOPMENT: 4,
  S5_VERIFIED_STABLE: 5,
}

export interface RequirementGuidanceHint {
  level: 'info' | 'warning' | 'critical'
  title: string
  message: string
}

interface RequirementWorksurfaceGuidanceSeed {
  requirementStabilityLevel: RequirementStabilityLevel
  totalUnits: number
  activeUnits: number
  unitsBelowTarget: number
  unitsBelowTargetSummary: Array<{
    layerLabel: string
    count: number
    targetStabilityLevel: RequirementStabilityLevel
  }>
  openIssueCount: number
  blockingIssueCount: number
  openConflictCount: number
  pendingClarificationCount: number
  highRiskChangeCount: number
  resignoffChangeCount: number
}

interface RequirementImpactSummarySeed {
  affectedRequirementUnitCount: number
  affectedRequirementUnits: Array<{
    id: string
    unitKey: string
    title: string
    reasons: string[]
  }>
  advanceUnits: Array<{
    id: string
    unitKey: string
    title: string
    layerLabel: string
    recommendation: string
  }>
  focusUnits: Array<{
    id: string
    unitKey: string
    title: string
    layerLabel: string
    recommendation: string
  }>
  openIssueCount: number
  blockingIssueCount: number
  openConflictCount: number
  pendingClarificationCount: number
  clarificationCallbackCount?: number
  clarificationSinklessCount?: number
  clarificationConclusions?: Array<{
    questionId: string
    questionText: string
    label: string
    effectLabel: string
    summary: string
    nextStep: string
    unitKey: string | null
    unitTitle: string | null
  }>
  unitsBelowTarget: number
  unitsBelowTargetSummary: Array<{
    layerLabel: string
    count: number
    targetStabilityLevel: RequirementStabilityLevel
  }>
  requirementStabilityLevel: RequirementStabilityLevel
}

interface RequirementStabilityGovernanceUnitSeed {
  id: string
  unitKey: string
  title: string
  layer: string
  status: RequirementUnitStatus
  stabilityLevel: string | null | undefined
}

interface RequirementStabilityGovernanceSeed {
  requirementStatus: RequirementStatus
  requirementStabilityLevel: RequirementStabilityLevel
  units: RequirementStabilityGovernanceUnitSeed[]
  unitsBelowTargetSummary: Array<{
    layerLabel: string
    count: number
    targetStabilityLevel: RequirementStabilityLevel
  }>
  blockingIssueCount: number
  openConflictCount: number
  pendingClarificationCount: number
}

interface RequirementIssuePressureSeed {
  activeIssues: Array<{
    id: string
    title: string
    type: string
    severity: string
    status: string
    blockDev: boolean
    primaryRequirementUnit: {
      unitKey: string
      title: string
      layer: string
    } | null
  }>
  openConflictCount: number
}

const REQUIREMENT_UNIT_STATUS_ORDER: Record<RequirementUnitStatus, number> = {
  READY_FOR_DEV: 0,
  READY_FOR_DESIGN: 1,
  AGREED: 2,
  REFINING: 3,
  DRAFT: 4,
  ARCHIVED: 5,
}

export function isRequirementStabilityAtLeast(level: string | null | undefined, target: RequirementStabilityLevel): boolean {
  if (!level || !(level in STABILITY_ORDER)) return false
  return STABILITY_ORDER[level as RequirementStabilityLevel] >= STABILITY_ORDER[target]
}

export function isLowRequirementStability(level: string | null | undefined): boolean {
  if (!level) return true
  return (LOW_REQUIREMENT_STABILITY_LEVELS as readonly string[]).includes(level)
}

function formatUnitsBelowTargetSummary(
  summary: RequirementWorksurfaceGuidanceSeed['unitsBelowTargetSummary'],
): string {
  if (summary.length === 0) return ''

  return summary
    .slice(0, 3)
    .map((item) => `${item.layerLabel} ${item.count} 个（目标 ${STABILITY_LABELS[item.targetStabilityLevel]}）`)
    .join('；')
}

function getRequirementNextStage(status: RequirementStatus): RequirementStatus | null {
  if (status === 'DRAFT') return 'IN_REVIEW'
  if (status === 'IN_REVIEW') return 'CONSENSUS'
  if (status === 'CONSENSUS') return 'IMPLEMENTING'
  if (status === 'IMPLEMENTING') return 'DONE'
  return null
}

function getRequirementUnitStabilityOrder(level: string | null | undefined): number {
  if (!level || !(level in STABILITY_ORDER)) return -1
  return STABILITY_ORDER[level as RequirementStabilityLevel]
}

function getRequirementUnitGapScore(unit: RequirementStabilityGovernanceUnitSeed): number {
  const profile = getRequirementUnitLayerProfile(unit.layer)
  return STABILITY_ORDER[profile.targetStabilityLevel] - getRequirementUnitStabilityOrder(unit.stabilityLevel)
}

export function buildRequirementStageAdvanceGuidance(seed: RequirementStabilityGovernanceSeed): RequirementGuidanceHint {
  const nextStage = getRequirementNextStage(seed.requirementStatus)

  if (!nextStage) {
    return {
      level: 'info',
      title: '当前已处于最终阶段',
      message: 'Requirement 已到达当前工作流终点，后续重点转为维护稳定度与沉淀结论。',
    }
  }

  const blockers: string[] = []
  if (seed.blockingIssueCount > 0) blockers.push(`${seed.blockingIssueCount} 个阻断问题`)
  if (seed.openConflictCount > 0) blockers.push(`${seed.openConflictCount} 个待处理 Conflict projection`)
  if (seed.pendingClarificationCount > 0) blockers.push(`${seed.pendingClarificationCount} 个未收敛 Clarification`)
  const unitsBelowTargetSummary = formatUnitsBelowTargetSummary(seed.unitsBelowTargetSummary)
  if (seed.unitsBelowTargetSummary.length > 0) {
    blockers.push(`分层目标未达标（${unitsBelowTargetSummary}）`)
  }
  if (isLowRequirementStability(seed.requirementStabilityLevel)) {
    blockers.push(`总体稳定度仍为 ${STABILITY_LABELS[seed.requirementStabilityLevel]}`)
  }

  if (blockers.length > 0) {
    return {
      level: seed.blockingIssueCount > 0 ? 'critical' : 'warning',
      title: `准备进入 ${STATUS_LABELS[nextStage]} 前建议先补齐关键信号`,
      message: `Requirement 当前处于 ${STATUS_LABELS[seed.requirementStatus]}。在准备进入 ${STATUS_LABELS[nextStage]} 前，建议先处理 ${blockers.join('、')}。本轮仍只做软提示，不直接阻断状态流转。`,
    }
  }

  return {
    level: 'info',
    title: `可以开始准备进入 ${STATUS_LABELS[nextStage]}`,
    message: `当前总体稳定度、分层目标与问题面没有明显阻塞信号。若需要进入 ${STATUS_LABELS[nextStage]}，建议优先推进已达标 Units 并保持对新增问题信号的观察。`,
  }
}

export function buildRequirementStabilityGovernance(seed: RequirementStabilityGovernanceSeed) {
  const activeUnits = seed.units.filter((unit) => unit.status !== 'ARCHIVED')
  const readyUnits = activeUnits
    .filter((unit) => isRequirementStabilityAtLeast(
      unit.stabilityLevel,
      getRequirementUnitLayerProfile(unit.layer).targetStabilityLevel,
    ))
    .sort((a, b) => {
      const statusDiff = REQUIREMENT_UNIT_STATUS_ORDER[a.status] - REQUIREMENT_UNIT_STATUS_ORDER[b.status]
      if (statusDiff !== 0) return statusDiff
      return getRequirementUnitStabilityOrder(b.stabilityLevel) - getRequirementUnitStabilityOrder(a.stabilityLevel)
    })
    .slice(0, 3)
    .map((unit) => {
      const profile = getRequirementUnitLayerProfile(unit.layer)
      const progressHint = getRequirementUnitProgressHint({
        layer: unit.layer,
        stabilityLevel: unit.stabilityLevel,
        status: unit.status,
      })

      return {
        id: unit.id,
        unitKey: unit.unitKey,
        title: unit.title,
        layerLabel: profile.label,
        currentStabilityLabel: unit.stabilityLevel && unit.stabilityLevel in STABILITY_LABELS
          ? STABILITY_LABELS[unit.stabilityLevel as RequirementStabilityLevel]
          : '未评估',
        targetStabilityLabel: STABILITY_LABELS[profile.targetStabilityLevel],
        recommendation: progressHint.message,
      }
    })

  const focusUnits = activeUnits
    .filter((unit) => !isRequirementStabilityAtLeast(
      unit.stabilityLevel,
      getRequirementUnitLayerProfile(unit.layer).targetStabilityLevel,
    ))
    .sort((a, b) => {
      const gapDiff = getRequirementUnitGapScore(b) - getRequirementUnitGapScore(a)
      if (gapDiff !== 0) return gapDiff
      return REQUIREMENT_UNIT_STATUS_ORDER[a.status] - REQUIREMENT_UNIT_STATUS_ORDER[b.status]
    })
    .slice(0, 3)
    .map((unit) => {
      const profile = getRequirementUnitLayerProfile(unit.layer)
      const progressHint = getRequirementUnitProgressHint({
        layer: unit.layer,
        stabilityLevel: unit.stabilityLevel,
        status: unit.status,
      })

      return {
        id: unit.id,
        unitKey: unit.unitKey,
        title: unit.title,
        layerLabel: profile.label,
        currentStabilityLabel: unit.stabilityLevel && unit.stabilityLevel in STABILITY_LABELS
          ? STABILITY_LABELS[unit.stabilityLevel as RequirementStabilityLevel]
          : '未评估',
        targetStabilityLabel: STABILITY_LABELS[profile.targetStabilityLevel],
        recommendation: progressHint.message,
      }
    })

  const riskLayers = seed.unitsBelowTargetSummary
    .slice(0, 3)
    .map((item) => ({
      layerLabel: item.layerLabel,
      count: item.count,
      targetStabilityLabel: STABILITY_LABELS[item.targetStabilityLevel],
      recommendation: `${item.layerLabel} 层仍有 ${item.count} 个 Unit 未达到 ${STABILITY_LABELS[item.targetStabilityLevel]}，当前是主要风险来源。`,
    }))

  return {
    readyUnits,
    focusUnits,
    riskLayers,
    stageAdvanceHint: buildRequirementStageAdvanceGuidance(seed),
  }
}

export function buildRequirementIssuePressure(seed: RequirementIssuePressureSeed) {
  const typeCounter = new Map<string, { count: number; blockingCount: number }>()
  const layerCounter = new Map<string, { layerLabel: string; count: number }>()
  const priorityContext = buildIssuePriorityContext({
    activeItems: seed.activeIssues.map((issue) => ({
      type: issue.type,
      primaryRequirementUnit: issue.primaryRequirementUnit,
    })),
  })

  for (const issue of seed.activeIssues) {
    const typeStats = typeCounter.get(issue.type) ?? { count: 0, blockingCount: 0 }
    typeCounter.set(issue.type, {
      count: typeStats.count + 1,
      blockingCount: typeStats.blockingCount + (issue.blockDev ? 1 : 0),
    })

    if (issue.primaryRequirementUnit?.layer) {
      const profile = getRequirementUnitLayerProfile(issue.primaryRequirementUnit.layer)
      const layerStats = layerCounter.get(issue.primaryRequirementUnit.layer) ?? {
        layerLabel: profile.label,
        count: 0,
      }
      layerCounter.set(issue.primaryRequirementUnit.layer, {
        layerLabel: layerStats.layerLabel,
        count: layerStats.count + 1,
      })
    }
  }

  if (seed.openConflictCount > 0) {
    const typeStats = typeCounter.get('conflict') ?? { count: 0, blockingCount: 0 }
    typeCounter.set('conflict', {
      count: typeStats.count + seed.openConflictCount,
      blockingCount: typeStats.blockingCount,
    })
  }

  const typeHotspots = Array.from(typeCounter.entries())
    .map(([type, stats]) => ({
      type,
      typeLabel: getIssueTypeLabel(type),
      count: stats.count,
      blockingCount: stats.blockingCount,
      recommendation: stats.blockingCount > 0
        ? `${getIssueTypeLabel(type)} 当前有 ${stats.count} 个开放项，其中 ${stats.blockingCount} 个阻断推进。建议先在 Issue Queue 中集中处理这类问题。`
        : `${getIssueTypeLabel(type)} 当前有 ${stats.count} 个开放项，建议优先在 Issue Queue 中收敛这类问题，减少对总体推进判断的持续干扰。`,
    }))
    .sort((a, b) => {
      const blockingDiff = b.blockingCount - a.blockingCount
      if (blockingDiff !== 0) return blockingDiff
      return b.count - a.count
    })
    .slice(0, 3)

  const layerHotspots = Array.from(layerCounter.entries())
    .map(([layer, stats]) => ({
      layer,
      layerLabel: stats.layerLabel,
      count: stats.count,
      recommendation: `${stats.layerLabel} 层当前有 ${stats.count} 个开放问题直接挂载，处理后最可能改善这一层的稳定度建议。`,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)

  const priorityHighlights = seed.activeIssues
    .map((issue) => {
      const priority = buildIssuePriorityMeta({
        type: issue.type,
        issueStatus: issue.status,
        severity: issue.severity,
        blockDev: issue.blockDev,
        primaryRequirementUnit: issue.primaryRequirementUnit,
        context: priorityContext,
      })

      return {
        id: issue.id,
        title: issue.title,
        typeLabel: getIssueTypeLabel(issue.type),
        unitKey: issue.primaryRequirementUnit?.unitKey ?? null,
        badges: priority.badges.map((badge) => badge.label),
        summary: priority.summary,
        score: priority.score,
      }
    })
    .filter((item) => item.badges.length > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)

  const nextQueueAction = priorityHighlights[0]
    ? `先处理 ${priorityHighlights[0].title}（${priorityHighlights[0].badges.join(' / ')}），它当前最直接影响推进判断。`
    : typeHotspots[0]
      ? typeHotspots[0].blockingCount > 0
        ? `先回到 Issue Queue 处理 ${typeHotspots[0].typeLabel} 类阻断问题，它们当前最影响阶段推进。`
        : `先回到 Issue Queue 收敛 ${typeHotspots[0].typeLabel} 类开放问题，减少对当前阶段判断的持续干扰。`
      : '当前没有明显的 Issue Queue 压力热点。'

  return {
    typeHotspots,
    layerHotspots,
    priorityHighlights,
    nextQueueAction,
  }
}

export function buildRequirementWorksurfaceGuidance(seed: RequirementWorksurfaceGuidanceSeed): RequirementGuidanceHint[] {
  const hints: RequirementGuidanceHint[] = []

  if (seed.totalUnits === 0) {
    hints.push({
      level: 'warning',
      title: '先建立 Requirement Units',
      message: '当前还没有 Requirement Units，建议先完成颗粒拆分，再判断推进优先级与成熟度。',
    })
  }

  if (isLowRequirementStability(seed.requirementStabilityLevel)) {
    hints.push({
      level: 'warning',
      title: '总体稳定度偏低',
      message: `当前总体稳定度为 ${STABILITY_LABELS[seed.requirementStabilityLevel]}，不建议进入开发，建议先收敛需求边界与主流程。`,
    })
  }

  if (seed.blockingIssueCount > 0) {
    hints.push({
      level: 'critical',
      title: '优先处理阻断问题',
      message: `当前存在 ${seed.blockingIssueCount} 个阻断问题，建议先在 Issue Queue 处理后再继续推进。`,
    })
  }

  if (seed.unitsBelowTarget > 0) {
    const summaryText = formatUnitsBelowTargetSummary(seed.unitsBelowTargetSummary)
    hints.push({
      level: 'warning',
      title: '关键单元稳定度未达标',
      message: `当前有 ${seed.unitsBelowTarget} 个 Requirement Units 低于各自 layer 的推荐目标${summaryText ? `，其中 ${summaryText}` : ''}，建议优先补齐颗粒推进。`,
    })
  }

  if (seed.openConflictCount > 0) {
    hints.push({
      level: 'warning',
      title: '仍有待处理冲突投影',
      message: `Issue Queue 中仍有 ${seed.openConflictCount} 个待处理冲突投影，建议先确认冲突是否成立并给出处理结论。`,
    })
  }

  if (seed.pendingClarificationCount > 0) {
    hints.push({
      level: 'info',
      title: '仍有待收敛澄清问题',
      message: `当前还有 ${seed.pendingClarificationCount} 个澄清问题未完全收敛，必要时可转入 Issue Queue 继续推进。`,
    })
  }

  if (seed.highRiskChangeCount > 0) {
    hints.push({
      level: 'warning',
      title: '存在高风险变更',
      message: `当前还有 ${seed.highRiskChangeCount} 个高风险 Change 未关闭，建议同步确认影响范围。`,
    })
  }

  if (seed.resignoffChangeCount > 0) {
    hints.push({
      level: 'warning',
      title: '存在待重新确认的变更',
      message: `当前有 ${seed.resignoffChangeCount} 个 Change 需要重新 signoff，建议在推进前确认评审范围。`,
    })
  }

  if (hints.length === 0) {
    hints.push({
      level: 'info',
      title: '当前工作面已基本收敛',
      message: '总体稳定度、Requirement Units 与 Issue Queue 当前没有明显阻塞信号，可以继续进入设计或开发准备。',
    })
  }

  return hints
}

export function buildRequirementImpactSummary(seed: RequirementImpactSummarySeed) {
  const reasons: string[] = []
  const signals: RequirementGuidanceHint[] = []
  const nextActions: string[] = []
  const clarificationCallbackCount = seed.clarificationCallbackCount ?? 0
  const clarificationSinklessCount = seed.clarificationSinklessCount ?? 0
  const clarificationConclusions = seed.clarificationConclusions ?? []
  const advanceUnitText = seed.advanceUnits
    .slice(0, 2)
    .map((unit) => `${unit.unitKey} · ${unit.title}`)
    .join('、')
  const focusUnitText = seed.focusUnits
    .slice(0, 2)
    .map((unit) => `${unit.unitKey} · ${unit.title}`)
    .join('、')

  if (seed.blockingIssueCount > 0) {
    reasons.push(`存在 ${seed.blockingIssueCount} 个阻断问题`)
    signals.push({
      level: 'critical',
      title: '阻断问题会直接影响推进',
      message: `当前有 ${seed.blockingIssueCount} 个阻断问题仍未关闭，Requirement 的后续推进会先受这些问题牵制。`,
    })
    nextActions.push(`先回到 Issue Queue 处理 ${seed.blockingIssueCount} 个阻断问题，再继续推进相关 Requirement Units。`)
  }

  if (seed.openIssueCount > 0) {
    signals.push({
      level: seed.blockingIssueCount > 0 ? 'warning' : 'info',
      title: '已有开放问题正在牵动当前推进',
      message: `当前有 ${seed.openIssueCount} 个开放问题项仍在 Issue Queue 中，说明这次推进会继续受到既有问题面的影响。`,
    })
    if (seed.blockingIssueCount === 0) {
      nextActions.push(`先在 Issue Queue 分诊并收敛 ${seed.openIssueCount} 个开放问题。`)
    }
  }

  if (seed.openConflictCount > 0) {
    reasons.push(`存在 ${seed.openConflictCount} 个待处理冲突投影`)
    signals.push({
      level: 'warning',
      title: '冲突投影仍未收敛',
      message: `当前有 ${seed.openConflictCount} 个 Conflict projection 仍未关闭，相关 Requirement Units 和边界定义可能继续被修正。`,
    })
    nextActions.push(`先确认 ${seed.openConflictCount} 个 Conflict projection 的处理结论，避免边界继续反复。`)
  }

  if (seed.pendingClarificationCount > 0) {
    reasons.push(`存在 ${seed.pendingClarificationCount} 个待收敛澄清问题`)
    signals.push({
      level: 'info',
      title: '澄清问题可能继续外溢',
      message: `当前仍有 ${seed.pendingClarificationCount} 个 Clarification 未收敛，这些问题后续仍可能继续转入 Issue Queue 或改写 Requirement Units。`,
    })
    nextActions.push(`先回到 Clarification 收敛 ${seed.pendingClarificationCount} 个未完成问答或回源确认。`)
  }

  if (clarificationCallbackCount > 0) {
    reasons.push(`有 ${clarificationCallbackCount} 条已关闭问题仍待回源确认`)
    signals.push({
      level: 'warning',
      title: '部分已关闭问题还没有完成结论确认',
      message: `当前有 ${clarificationCallbackCount} 条 Clarification 来源问题虽然已关闭，但仍需要回到来源问答面确认结论是否真正收敛到对应 Requirement Unit。`,
    })
    nextActions.push(`先回到 Clarification 确认 ${clarificationCallbackCount} 条已关闭问题是否已经沉淀到对应 Requirement Unit。`)
  }

  if (clarificationSinklessCount > 0) {
    reasons.push(`有 ${clarificationSinklessCount} 条已关闭问题尚未形成明确内容落点`)
    signals.push({
      level: 'warning',
      title: '部分已关闭问题仍缺少内容沉淀落点',
      message: `当前有 ${clarificationSinklessCount} 条 Clarification 来源问题虽然已关闭，但还没有明确沉淀到具体 Requirement Unit，仍需人工补内容。`,
    })
    nextActions.push(`先补齐 ${clarificationSinklessCount} 条已关闭问题的 Unit 落点或内容回填，避免只关问题不沉淀结论。`)
  }

  if (seed.unitsBelowTarget > 0) {
    reasons.push(`有 ${seed.unitsBelowTarget} 个 Requirement Units 低于目标稳定度`)
    const focusLayers = formatUnitsBelowTargetSummary(seed.unitsBelowTargetSummary)
    signals.push({
      level: 'warning',
      title: '部分 Requirement Units 仍低于分层目标',
      message: `当前有 ${seed.unitsBelowTarget} 个 Requirement Units 低于各自 layer 的推荐稳定度${focusLayers ? `，其中 ${focusLayers}` : ''}。`,
    })
    nextActions.push(
      focusUnitText
        ? `优先补齐 ${focusUnitText}，再评估是否继续放大推进动作。`
        : '优先补齐低于分层目标的 Requirement Units，再评估是否继续放大推进动作。',
    )
  }

  if (isLowRequirementStability(seed.requirementStabilityLevel)) {
    reasons.push('总体稳定度仍偏低')
    signals.push({
      level: 'warning',
      title: '总体稳定度仍会放大影响面',
      message: `Requirement 总体稳定度目前为 ${STABILITY_LABELS[seed.requirementStabilityLevel]}，意味着局部改动更容易反向影响顶层边界和推进判断。`,
    })
    nextActions.push('先补顶层边界与主流程，再继续进入更后阶段。')
  }

  if (seed.advanceUnits.length > 0) {
    nextActions.push(
      advanceUnitText
        ? `可并行推进 ${advanceUnitText}，这些 Units 当前更接近阶段目标。`
        : '可优先推进已达到当前阶段目标的 Requirement Units。',
    )
  }

  const headline = reasons.length > 0
    ? `当前推进会牵动 ${seed.affectedRequirementUnitCount} 个 Requirement Units，并受到 ${seed.openIssueCount} 个开放问题信号影响。`
    : '当前未发现明显的推进外溢信号，影响面相对可控。'

  const nextStep = seed.blockingIssueCount > 0
    ? nextActions[0] ?? '先回到 Issue Queue 处理当前最影响推进的问题。'
    : seed.focusUnits[0]
      ? `先补齐 ${seed.focusUnits[0].unitKey} · ${seed.focusUnits[0].title}，它目前最直接影响总体推进判断。`
      : seed.advanceUnits[0]
        ? `优先推进 ${seed.advanceUnits[0].unitKey} · ${seed.advanceUnits[0].title}，它当前已经更接近可继续放大的推进条件。`
        : nextActions[0] ?? '可以继续按当前 Requirement Worksurface 推进，并关注新增问题信号。'

  return {
    affectedRequirementUnitCount: seed.affectedRequirementUnitCount,
    affectedRequirementUnits: seed.affectedRequirementUnits.slice(0, 4).map((unit) => ({
      ...unit,
      reasons: unit.reasons.slice(0, 3),
    })),
    advanceUnits: seed.advanceUnits.slice(0, 3),
    focusUnits: seed.focusUnits.slice(0, 3),
    openIssueCount: seed.openIssueCount,
    blockingIssueCount: seed.blockingIssueCount,
    hasBlockingIssue: seed.blockingIssueCount > 0,
    mayAffectStability: reasons.length > 0,
    openConflictCount: seed.openConflictCount,
    pendingClarificationCount: seed.pendingClarificationCount,
    unitsBelowTarget: seed.unitsBelowTarget,
    headline,
    nextStep,
    nextActions: nextActions.slice(0, 4),
    clarificationConclusions: clarificationConclusions.slice(0, 3),
    signals,
    reasons,
  }
}

export function summarizeUnitsBelowLayerTarget(units: Array<{
  layer: string
  stabilityLevel: string | null | undefined
}>): Array<{
  layer: string
  layerLabel: string
  count: number
  targetStabilityLevel: RequirementStabilityLevel
}> {
  const counter = new Map<string, {
    layerLabel: string
    count: number
    targetStabilityLevel: RequirementStabilityLevel
  }>()

  for (const unit of units) {
    const profile = getRequirementUnitLayerProfile(unit.layer)
    if (isRequirementStabilityAtLeast(unit.stabilityLevel, profile.targetStabilityLevel)) {
      continue
    }

    const current = counter.get(unit.layer) ?? {
      layerLabel: profile.label,
      count: 0,
      targetStabilityLevel: profile.targetStabilityLevel,
    }

    counter.set(unit.layer, {
      layerLabel: current.layerLabel,
      count: current.count + 1,
      targetStabilityLevel: current.targetStabilityLevel,
    })
  }

  return Array.from(counter.entries())
    .map(([layer, data]) => ({
      layer,
      ...data,
    }))
    .sort((a, b) => b.count - a.count)
}
