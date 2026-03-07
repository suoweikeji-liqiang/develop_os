import { z } from 'zod'
import type { IssueUnitSeverity, IssueUnitStatus } from './requirement-evolution'

export const IssueUnitTypeEnum = z.enum([
  'ambiguity',
  'missing',
  'conflict',
  'risk',
  'pending_confirmation',
  'prototype_doc_mismatch',
  'permission_gap',
  'exception_gap',
])

export type IssueUnitType = z.infer<typeof IssueUnitTypeEnum>
export type IssueQueueKind = 'issue' | 'conflict'
export type ConflictQueueStatus = 'OPEN' | 'DISMISSED' | 'RESOLVED'
export type ClarificationQuestionCategory =
  | 'GOAL'
  | 'SCOPE'
  | 'USER'
  | 'IO'
  | 'CONSTRAINT'
  | 'ACCEPTANCE'
  | 'RISK'
  | 'OTHER'
export type ClarificationQuestionStatus = 'OPEN' | 'ANSWERED' | 'RESOLVED' | 'SKIPPED'

export const ISSUE_UNIT_TYPE_LABELS: Record<IssueUnitType, string> = {
  ambiguity: 'Ambiguity',
  missing: 'Missing',
  conflict: 'Conflict',
  risk: 'Risk',
  pending_confirmation: 'Pending Confirmation',
  prototype_doc_mismatch: 'Prototype / Doc Mismatch',
  permission_gap: 'Permission Gap',
  exception_gap: 'Exception Gap',
}

export const ISSUE_UNIT_TYPE_DESCRIPTIONS: Record<IssueUnitType, string> = {
  ambiguity: '描述存在多解或边界不清。',
  missing: '关键信息、流程、数据或规则缺失。',
  conflict: '需求内部或跨需求存在冲突。',
  risk: '存在明显的推进风险或实现风险。',
  pending_confirmation: '需要业务或相关角色进一步确认。',
  prototype_doc_mismatch: '原型、文档或设计稿之间存在不一致。',
  permission_gap: '权限边界或角色动作未闭合。',
  exception_gap: '异常路径、失败恢复或容错处理不完整。',
}

export const ISSUE_UNIT_TYPE_OPTIONS = IssueUnitTypeEnum.options.map((value) => ({
  value,
  label: ISSUE_UNIT_TYPE_LABELS[value],
  description: ISSUE_UNIT_TYPE_DESCRIPTIONS[value],
}))

export const ACTIVE_ISSUE_UNIT_STATUSES = ['OPEN', 'TRIAGED', 'IN_PROGRESS', 'WAITING_CONFIRMATION'] as const satisfies readonly IssueUnitStatus[]
export const CLOSED_ISSUE_UNIT_STATUSES = ['RESOLVED', 'REJECTED', 'ARCHIVED'] as const satisfies readonly IssueUnitStatus[]
export const CLARIFICATION_TO_ISSUE_ELIGIBLE_STATUSES = ['ANSWERED', 'SKIPPED'] as const satisfies readonly ClarificationQuestionStatus[]

const CLARIFICATION_CATEGORY_LABELS: Record<ClarificationQuestionCategory, string> = {
  GOAL: '目标',
  SCOPE: '范围',
  USER: '用户角色',
  IO: '输入输出',
  CONSTRAINT: '约束',
  ACCEPTANCE: '验收',
  RISK: '风险',
  OTHER: '其他',
}

const CLARIFICATION_STATUS_LABELS: Record<ClarificationQuestionStatus, string> = {
  OPEN: '待回答',
  ANSWERED: '已回答待收敛',
  RESOLVED: '已收敛',
  SKIPPED: '已跳过待跟进',
}

const CONFLICT_STATUS_LABELS: Record<ConflictQueueStatus, string> = {
  OPEN: '待处理',
  DISMISSED: '已驳回',
  RESOLVED: '已处理',
}

const ISSUE_TYPE_RANK: Record<IssueUnitType, number> = {
  conflict: 0,
  risk: 1,
  missing: 2,
  ambiguity: 3,
  pending_confirmation: 4,
  permission_gap: 5,
  exception_gap: 6,
  prototype_doc_mismatch: 7,
}

const ISSUE_SEVERITY_RANK: Record<IssueUnitSeverity, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
}

const ISSUE_STATUS_RANK: Record<IssueUnitStatus, number> = {
  OPEN: 0,
  TRIAGED: 1,
  IN_PROGRESS: 2,
  WAITING_CONFIRMATION: 3,
  RESOLVED: 4,
  REJECTED: 5,
  ARCHIVED: 6,
}

export function normalizeIssueType(type: string): string {
  const normalized = type.trim().toLowerCase()
  return normalized
}

export function isIssueType(value: string): value is IssueUnitType {
  return IssueUnitTypeEnum.safeParse(value).success
}

export function getIssueTypeLabel(type: string): string {
  return isIssueType(type) ? ISSUE_UNIT_TYPE_LABELS[type] : type
}

export function getIssueTypeDescription(type: string): string | null {
  return isIssueType(type) ? ISSUE_UNIT_TYPE_DESCRIPTIONS[type] : null
}

export function getIssueQueueSourceLabel(sourceType: string | null, queueKind: IssueQueueKind): string {
  if (queueKind === 'conflict') return 'Conflict Projection'
  if (sourceType === 'clarification') return 'Clarification'
  if (sourceType === 'manual') return 'Manual Issue'
  if (sourceType === 'conflict-scan') return 'Conflict Scan'
  if (sourceType === 'model-bootstrap') return 'Model Bootstrap'
  return 'Issue Queue'
}

export function isActiveIssueStatus(status: string): status is IssueUnitStatus {
  return (ACTIVE_ISSUE_UNIT_STATUSES as readonly string[]).includes(status)
}

export function isClarificationCategory(value: string): value is ClarificationQuestionCategory {
  return Object.prototype.hasOwnProperty.call(CLARIFICATION_CATEGORY_LABELS, value)
}

export function isClarificationStatus(value: string): value is ClarificationQuestionStatus {
  return Object.prototype.hasOwnProperty.call(CLARIFICATION_STATUS_LABELS, value)
}

export function getClarificationCategoryLabel(category: string | null | undefined): string | null {
  if (!category || !isClarificationCategory(category)) return null
  return CLARIFICATION_CATEGORY_LABELS[category]
}

export function getClarificationStatusLabel(status: string | null | undefined): string | null {
  if (!status || !isClarificationStatus(status)) return null
  return CLARIFICATION_STATUS_LABELS[status]
}

export function getConflictStatusLabel(status: string | null | undefined): string | null {
  if (!status || !Object.prototype.hasOwnProperty.call(CONFLICT_STATUS_LABELS, status)) return null
  return CONFLICT_STATUS_LABELS[status as ConflictQueueStatus]
}

export function shouldClarificationEnterIssueQueue(input: {
  category: string
  status: string
}): boolean {
  return input.category === 'RISK' || (CLARIFICATION_TO_ISSUE_ELIGIBLE_STATUSES as readonly string[]).includes(input.status)
}

export function getClarificationIssueQueueReason(input: {
  category: string
  status: string
}): string {
  if (input.category === 'RISK') {
    return '风险类 Clarification 即使尚未完全回答，也可以直接转入 Issue Queue 持续推进。'
  }

  if (input.status === 'ANSWERED') {
    return '该 Clarification 已有回答但尚未收敛，适合转入 Issue Queue 做持续跟踪。'
  }

  if (input.status === 'SKIPPED') {
    return '该 Clarification 已被跳过，建议转入 Issue Queue 继续跟踪未收敛问题。'
  }

  return '当前仍建议先在 Clarification 中完成回答或判断风险，再决定是否转入 Issue Queue。'
}

export function getIssueQueueSourceStatusLabel(input: {
  queueKind: IssueQueueKind
  sourceType: string | null
  status: string | null | undefined
}): string | null {
  if (!input.status) return null
  if (input.queueKind === 'conflict') return getConflictStatusLabel(input.status)
  if (input.sourceType === 'clarification') return getClarificationStatusLabel(input.status)
  return null
}

export function mapConflictStatusToIssueStatus(status: ConflictQueueStatus): IssueUnitStatus {
  if (status === 'DISMISSED') return 'REJECTED'
  if (status === 'RESOLVED') return 'RESOLVED'
  return 'OPEN'
}

export function mapIssueStatusToConflictStatus(status: string): ConflictQueueStatus {
  if (status === 'REJECTED' || status === 'ARCHIVED') return 'DISMISSED'
  if (status === 'RESOLVED') return 'RESOLVED'
  return 'OPEN'
}

interface IssueQueueLifecycleInput {
  queueKind: IssueQueueKind
  sourceType: string | null
  issueStatus: string
  blockDev: boolean
  sourceStatus?: string | null
  sourceCategory?: string | null
}

export interface IssueQueueLifecycleMeta {
  sourceSummary: string
  blockingSummary: string
  closeMeaning: string
  followupSummary: string
  requiresSourceFollowup: boolean
}

export function buildIssueQueueLifecycleMeta(input: IssueQueueLifecycleInput): IssueQueueLifecycleMeta {
  const active = isActiveIssueStatus(input.issueStatus)
  const clarificationCategoryLabel = getClarificationCategoryLabel(input.sourceCategory)
  const clarificationStatusLabel = getClarificationStatusLabel(input.sourceStatus)
  const conflictStatusLabel = getConflictStatusLabel(input.sourceStatus)

  const blockingSummary = active
    ? input.blockDev
      ? '当前阻断 Requirement 推进，建议优先处理后再进入设计或开发准备。'
      : '当前不阻断开发，但仍是活跃推进问题，会持续影响需求收敛。'
    : '该项当前已关闭，不再作为活跃推进问题。'

  if (input.queueKind === 'conflict') {
    return {
      sourceSummary: `来自 Conflict Scan 投影${conflictStatusLabel ? `，原 Conflict 当前为${conflictStatusLabel}` : ''}。`,
      blockingSummary,
      closeMeaning: '在 Issue Queue 中标记为已处理会同步原 Conflict 为已处理；标记为已驳回或归档会同步原 Conflict 为已驳回。',
      followupSummary: '如需复核扫描证据、关联需求或处理备注，请回到 Conflict Panel 查看来源对象。',
      requiresSourceFollowup: false,
    }
  }

  if (input.sourceType === 'clarification') {
    const sourceTail = [
      clarificationCategoryLabel ? `${clarificationCategoryLabel}类问题` : null,
      clarificationStatusLabel ? `原 Clarification 当前为${clarificationStatusLabel}` : null,
    ].filter(Boolean).join('，')
    const needsFollowup = input.sourceStatus !== 'RESOLVED'

    return {
      sourceSummary: `来自 Clarification${sourceTail ? `，${sourceTail}` : ''}。`,
      blockingSummary,
      closeMeaning: '关闭表示该澄清衍生问题已处理、已确认无效或无需继续跟踪；不会自动修改原 Clarification 状态。',
      followupSummary: needsFollowup
        ? active
          ? '处理形成确定结论后，仍需回到 Clarification 回填问答并标记为已收敛。'
          : `当前 Issue 已关闭，但原 Clarification${clarificationStatusLabel ? `仍为${clarificationStatusLabel}` : '尚未收敛'}，如结论已明确，请回到 Clarification 完成最终确认。`
        : '原 Clarification 已收敛，无需再回到来源对象。',
      requiresSourceFollowup: needsFollowup,
    }
  }

  if (input.sourceType === 'manual') {
    return {
      sourceSummary: '来自人工补录，当前在 Issue Queue 中直接推进。',
      blockingSummary,
      closeMeaning: '关闭表示该问题已完成处理、确认不成立，或无需继续跟踪。',
      followupSummary: '无需回到其他来源对象，后续只需在 Requirement 或 Requirement Unit 上继续推进。',
      requiresSourceFollowup: false,
    }
  }

  if (input.sourceType === 'model-bootstrap') {
    return {
      sourceSummary: '来自模型初始化阶段的遗留问题沉淀，当前统一在 Issue Queue 跟踪。',
      blockingSummary,
      closeMeaning: '关闭表示该初始化阶段遗留问题已被处理或不再成立。',
      followupSummary: '必要时可回到对应 Requirement Unit 补齐说明，但无需维护独立问题入口。',
      requiresSourceFollowup: false,
    }
  }

  return {
    sourceSummary: '来自当前 Requirement 的问题沉淀，默认在 Issue Queue 统一推进。',
    blockingSummary,
    closeMeaning: '关闭表示该问题已处理、被驳回或无需继续跟踪。',
    followupSummary: '如有相关 Requirement Unit，可继续回到颗粒单元补齐实现边界。',
    requiresSourceFollowup: false,
  }
}

export function compareIssueQueueItems<T extends {
  blockDev: boolean
  status: string
  severity: string
  type: string
  updatedAt: string | Date
}>(a: T, b: T): number {
  if (a.blockDev !== b.blockDev) return a.blockDev ? -1 : 1

  const aActive = isActiveIssueStatus(a.status)
  const bActive = isActiveIssueStatus(b.status)
  if (aActive !== bActive) return aActive ? -1 : 1

  const aStatusRank = ISSUE_STATUS_RANK[a.status as IssueUnitStatus] ?? 999
  const bStatusRank = ISSUE_STATUS_RANK[b.status as IssueUnitStatus] ?? 999
  if (aStatusRank !== bStatusRank) return aStatusRank - bStatusRank

  const aSeverityRank = ISSUE_SEVERITY_RANK[a.severity as IssueUnitSeverity] ?? 999
  const bSeverityRank = ISSUE_SEVERITY_RANK[b.severity as IssueUnitSeverity] ?? 999
  if (aSeverityRank !== bSeverityRank) return aSeverityRank - bSeverityRank

  const aTypeRank = isIssueType(a.type) ? ISSUE_TYPE_RANK[a.type] : 999
  const bTypeRank = isIssueType(b.type) ? ISSUE_TYPE_RANK[b.type] : 999
  if (aTypeRank !== bTypeRank) return aTypeRank - bTypeRank

  return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
}
