export const OPEN_CHANGE_STATUSES = ['PROPOSED', 'UNDER_REVIEW', 'APPROVED'] as const
export const HIGH_RISK_CHANGE_LEVELS = ['HIGH', 'CRITICAL'] as const
export const ACTIVE_CHANGE_STATUSES = ['PROPOSED', 'UNDER_REVIEW', 'APPROVED'] as const
export const OPEN_ISSUE_STATUSES = ['OPEN', 'TRIAGED', 'IN_PROGRESS', 'WAITING_CONFIRMATION'] as const

interface ChangeImpactFlags {
  requiresResignoff: boolean
  affectsTests: boolean
  affectsPrototype: boolean
  affectsCode: boolean
}

export function buildChangeImpactHints(change: ChangeImpactFlags) {
  const hints: string[] = []

  if (change.requiresResignoff) hints.push('需要重新 signoff')
  if (change.affectsTests) hints.push('影响测试')
  if (change.affectsPrototype) hints.push('影响原型')
  if (change.affectsCode) hints.push('影响代码')

  return hints
}

interface RequirementGateHintSeed {
  blockingIssueCount: number
  highRiskChangeCount: number
  resignoffChangeCount: number
}

export function buildRequirementGateHints(seed: RequirementGateHintSeed) {
  const hints: Array<{ level: 'warning' | 'critical'; message: string }> = []

  if (seed.blockingIssueCount > 0) {
    hints.push({
      level: 'critical',
      message: `存在 ${seed.blockingIssueCount} 个阻断问题，建议先处理再推进`,
    })
  }

  if (seed.highRiskChangeCount > 0) {
    hints.push({
      level: 'critical',
      message: `存在 ${seed.highRiskChangeCount} 个高风险变更仍未完成`,
    })
  }

  if (seed.resignoffChangeCount > 0) {
    hints.push({
      level: 'warning',
      message: `存在 ${seed.resignoffChangeCount} 个需要重新 signoff 的变更，请先确认评审范围`,
    })
  }

  return hints
}
