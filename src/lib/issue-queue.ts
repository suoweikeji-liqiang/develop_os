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
