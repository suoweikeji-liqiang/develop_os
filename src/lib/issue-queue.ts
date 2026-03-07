import { z } from 'zod'
import {
  ISSUE_UNIT_STATUS_LABELS,
  type IssueUnitSeverity,
  type IssueUnitStatus,
} from './requirement-evolution'
import { getRequirementUnitLayerProfile } from './requirement-unit-layer'

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
export type ClarificationQueueStatus =
  | 'stay_in_clarification'
  | 'eligible_for_issue_queue'
  | 'tracking_in_issue_queue'
  | 'closed_needs_confirmation'
  | 'closed_confirmed'
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

export interface ConflictProjectionStatusMeta {
  label: string
  summary: string
}

export function buildConflictProjectionStatusMeta(status: string | null | undefined): ConflictProjectionStatusMeta {
  if (status === 'RESOLVED') {
    return {
      label: '已同步为已处理',
      summary: '对应 projection 已在 Issue Queue 中关闭，原 Conflict 已同步为已处理；Conflict Panel 继续只保留扫描证据与处理备注。',
    }
  }

  if (status === 'DISMISSED') {
    return {
      label: '已同步为已驳回',
      summary: '对应 projection 已在 Issue Queue 中被驳回或归档，原 Conflict 已同步为已驳回；扫描证据仍会保留，必要时可重新复核。',
    }
  }

  return {
    label: '待在 Issue Queue 处理',
    summary: '原 Conflict 当前仍为待处理。默认问题推进在 Issue Queue 中进行，Conflict Panel 主要提供扫描证据、上下文与处理备注。',
  }
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

function getIssueUnitStatusLabel(status: string | null | undefined): string | null {
  if (!status) return null
  if (!Object.prototype.hasOwnProperty.call(ISSUE_UNIT_STATUS_LABELS, status)) return status
  return ISSUE_UNIT_STATUS_LABELS[status as IssueUnitStatus]
}

export interface ClarificationQueueStatusMeta {
  state: ClarificationQueueStatus
  label: string
  summary: string
  callbackNeeded: boolean
  callbackSummary: string | null
}

export function doesClarificationIssueNeedSourceConfirmation(input: {
  clarificationStatus: string | null | undefined
  issueStatus: string | null | undefined
}): boolean {
  if (!input.issueStatus) return false
  if (isActiveIssueStatus(input.issueStatus)) return false
  return input.clarificationStatus !== 'RESOLVED'
}

export function buildClarificationQueueStatusMeta(input: {
  category: string
  clarificationStatus: string
  issueStatus?: string | null
}): ClarificationQueueStatusMeta {
  const clarificationStatusLabel = getClarificationStatusLabel(input.clarificationStatus) ?? input.clarificationStatus
  const issueStatusLabel = getIssueUnitStatusLabel(input.issueStatus)
  const callbackNeeded = doesClarificationIssueNeedSourceConfirmation({
    clarificationStatus: input.clarificationStatus,
    issueStatus: input.issueStatus,
  })

  if (input.issueStatus) {
    if (callbackNeeded) {
      return {
        state: 'closed_needs_confirmation',
        label: '待回源确认',
        summary: `对应 Issue 已${issueStatusLabel ?? input.issueStatus}，但原 Clarification 当前仍为${clarificationStatusLabel}。如结论已明确，请人工确认该澄清是否已收敛。`,
        callbackNeeded: true,
        callbackSummary: 'Issue Queue 已结束当前问题推进；Clarification 仍需人工确认是否可以标记为已收敛。',
      }
    }

    if (isActiveIssueStatus(input.issueStatus)) {
      return {
        state: 'tracking_in_issue_queue',
        label: 'Issue Queue 跟踪中',
        summary: `已转入 Issue Queue，当前状态为${issueStatusLabel ?? input.issueStatus}。问题推进默认在上方 Issue Queue 中进行，Clarification 继续保留为来源问答记录。`,
        callbackNeeded: false,
        callbackSummary: null,
      }
    }

    return {
      state: 'closed_confirmed',
      label: '回源已确认',
      summary: `对应 Issue 已${issueStatusLabel ?? input.issueStatus}，Clarification 也已标记为已收敛，当前仅保留来源记录。`,
      callbackNeeded: false,
      callbackSummary: null,
    }
  }

  if (shouldClarificationEnterIssueQueue({
    category: input.category,
    status: input.clarificationStatus,
  })) {
    return {
      state: 'eligible_for_issue_queue',
      label: '可转入 Issue Queue',
      summary: getClarificationIssueQueueReason({
        category: input.category,
        status: input.clarificationStatus,
      }),
      callbackNeeded: false,
      callbackSummary: null,
    }
  }

  return {
    state: 'stay_in_clarification',
    label: '先在 Clarification 收敛',
    summary: `${getClarificationIssueQueueReason({
      category: input.category,
      status: input.clarificationStatus,
    })} 当前仍以 Clarification 原始问答收敛为主。`,
    callbackNeeded: false,
    callbackSummary: null,
  }
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

export interface IssueQueueStabilityImpactMeta {
  level: 'critical' | 'warning' | 'info'
  title: string
  summary: string
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
      sourceSummary: `来自 Conflict Scan 投影${conflictStatusLabel ? `，原 Conflict 当前为${conflictStatusLabel}` : ''}。默认处理面在 Issue Queue，Conflict Panel 仅保留扫描证据与上下文。`,
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

export function buildIssueQueueStabilityImpactMeta(input: {
  type: string
  issueStatus: string
  blockDev: boolean
  primaryRequirementUnit?: {
    unitKey: string
    title: string
    layer?: string | null
    stabilityLevel?: string | null
  } | null
}): IssueQueueStabilityImpactMeta {
  const typeLabel = getIssueTypeLabel(input.type)
  const issueStatusLabel = ISSUE_UNIT_STATUS_LABELS[input.issueStatus as IssueUnitStatus] ?? input.issueStatus
  const unit = input.primaryRequirementUnit ?? null
  const layerProfile = unit?.layer ? getRequirementUnitLayerProfile(unit.layer) : null

  if (!isActiveIssueStatus(input.issueStatus)) {
    return {
      level: 'info',
      title: '当前已不再直接拖住稳定度',
      summary: unit
        ? `${typeLabel} 问题当前已${issueStatusLabel}。下一步重点是确认 ${unit.unitKey} · ${unit.title} 是否因此改善了推进条件或稳定度判断。`
        : `${typeLabel} 问题当前已${issueStatusLabel}，对当前阶段推进的直接压力已经下降。`,
    }
  }

  if (input.blockDev) {
    return {
      level: 'critical',
      title: '当前最影响阶段推进的队列项之一',
      summary: unit && layerProfile
        ? `${typeLabel} 当前是阻断项，并直接压在 ${unit.unitKey} · ${unit.title}（${layerProfile.label} 层）上。优先处理这类问题，最可能改善当前阶段推进与稳定度判断。`
        : `${typeLabel} 当前是阻断项，会直接影响 Requirement 的阶段推进判断。建议优先在 Issue Queue 中处理。`,
    }
  }

  if (unit && layerProfile) {
    return {
      level: 'warning',
      title: `主要影响 ${layerProfile.label} 层推进判断`,
      summary: `${typeLabel} 当前挂在 ${unit.unitKey} · ${unit.title} 上。处理后最可能改善 ${layerProfile.label} 层的稳定度和推进建议。`,
    }
  }

  return {
    level: 'info',
    title: '当前会继续牵动总体推进判断',
    summary: `${typeLabel} 当前仍为${issueStatusLabel}，虽然没有直接绑定 Unit，但会继续影响总体问题面与稳定度建议。`,
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
