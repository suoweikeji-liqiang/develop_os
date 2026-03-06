export const OPEN_CHANGE_STATUSES = ['PROPOSED', 'UNDER_REVIEW', 'APPROVED'] as const
export const HIGH_RISK_CHANGE_LEVELS = ['HIGH', 'CRITICAL'] as const
export const ACTIVE_CHANGE_STATUSES = ['PROPOSED', 'UNDER_REVIEW', 'APPROVED'] as const

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
