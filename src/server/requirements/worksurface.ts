import { STABILITY_LABELS, type RequirementStabilityLevel } from '@/lib/requirement-evolution'
import {
  DEFAULT_REQUIREMENT_UNIT_TARGET_STABILITY_LEVEL,
  getRequirementUnitLayerProfile,
} from '@/lib/requirement-unit-layer'

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
  openIssueCount: number
  blockingIssueCount: number
  openConflictCount: number
  pendingClarificationCount: number
  unitsBelowTarget: number
  requirementStabilityLevel: RequirementStabilityLevel
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

  if (seed.blockingIssueCount > 0) {
    reasons.push(`存在 ${seed.blockingIssueCount} 个阻断问题`)
  }

  if (seed.openConflictCount > 0) {
    reasons.push(`存在 ${seed.openConflictCount} 个待处理冲突投影`)
  }

  if (seed.pendingClarificationCount > 0) {
    reasons.push(`存在 ${seed.pendingClarificationCount} 个待收敛澄清问题`)
  }

  if (seed.unitsBelowTarget > 0) {
    reasons.push(`有 ${seed.unitsBelowTarget} 个 Requirement Units 低于目标稳定度`)
  }

  if (isLowRequirementStability(seed.requirementStabilityLevel)) {
    reasons.push('总体稳定度仍偏低')
  }

  return {
    affectedRequirementUnitCount: seed.affectedRequirementUnitCount,
    openIssueCount: seed.openIssueCount,
    blockingIssueCount: seed.blockingIssueCount,
    hasBlockingIssue: seed.blockingIssueCount > 0,
    mayAffectStability: reasons.length > 0,
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
