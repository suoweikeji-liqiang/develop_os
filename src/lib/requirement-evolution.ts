import { z } from 'zod'

export const RequirementStabilityLevelEnum = z.enum([
  'S0_IDEA',
  'S1_ROUGHLY_DEFINED',
  'S2_MAIN_FLOW_CLEAR',
  'S3_ALMOST_READY',
  'S4_READY_FOR_DEVELOPMENT',
  'S5_VERIFIED_STABLE',
])

export const RequirementUnitStatusEnum = z.enum([
  'DRAFT',
  'REFINING',
  'AGREED',
  'READY_FOR_DESIGN',
  'READY_FOR_DEV',
  'ARCHIVED',
])

export const IssueUnitSeverityEnum = z.enum([
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL',
])

export const IssueUnitStatusEnum = z.enum([
  'OPEN',
  'TRIAGED',
  'IN_PROGRESS',
  'WAITING_CONFIRMATION',
  'RESOLVED',
  'REJECTED',
  'ARCHIVED',
])

export type RequirementStabilityLevel = z.infer<typeof RequirementStabilityLevelEnum>
export type RequirementUnitStatus = z.infer<typeof RequirementUnitStatusEnum>
export type IssueUnitSeverity = z.infer<typeof IssueUnitSeverityEnum>
export type IssueUnitStatus = z.infer<typeof IssueUnitStatusEnum>

export const STABILITY_LABELS: Record<RequirementStabilityLevel, string> = {
  S0_IDEA: 'S0 Idea',
  S1_ROUGHLY_DEFINED: 'S1 Roughly Defined',
  S2_MAIN_FLOW_CLEAR: 'S2 Main Flow Clear',
  S3_ALMOST_READY: 'S3 Almost Ready',
  S4_READY_FOR_DEVELOPMENT: 'S4 Ready for Development',
  S5_VERIFIED_STABLE: 'S5 Verified Stable',
}

export const STABILITY_OPTIONS = RequirementStabilityLevelEnum.options.map((value) => ({
  value,
  label: STABILITY_LABELS[value],
}))

export const STABILITY_CLASSES: Record<RequirementStabilityLevel, string> = {
  S0_IDEA: 'bg-rose-100 text-rose-700',
  S1_ROUGHLY_DEFINED: 'bg-orange-100 text-orange-700',
  S2_MAIN_FLOW_CLEAR: 'bg-amber-100 text-amber-800',
  S3_ALMOST_READY: 'bg-sky-100 text-sky-700',
  S4_READY_FOR_DEVELOPMENT: 'bg-emerald-100 text-emerald-700',
  S5_VERIFIED_STABLE: 'bg-green-100 text-green-800',
}

export const REQUIREMENT_UNIT_STATUS_LABELS: Record<RequirementUnitStatus, string> = {
  DRAFT: '草稿',
  REFINING: '收敛中',
  AGREED: '已达成一致',
  READY_FOR_DESIGN: '可进入设计',
  READY_FOR_DEV: '可进入开发',
  ARCHIVED: '已归档',
}

export const REQUIREMENT_UNIT_STATUS_OPTIONS = RequirementUnitStatusEnum.options.map((value) => ({
  value,
  label: REQUIREMENT_UNIT_STATUS_LABELS[value],
}))

export const ISSUE_UNIT_STATUS_LABELS: Record<IssueUnitStatus, string> = {
  OPEN: '待处理',
  TRIAGED: '已分诊',
  IN_PROGRESS: '处理中',
  WAITING_CONFIRMATION: '待确认',
  RESOLVED: '已解决',
  REJECTED: '已驳回',
  ARCHIVED: '已归档',
}

export const ISSUE_UNIT_STATUS_OPTIONS = IssueUnitStatusEnum.options.map((value) => ({
  value,
  label: ISSUE_UNIT_STATUS_LABELS[value],
}))

export const ISSUE_UNIT_SEVERITY_LABELS: Record<IssueUnitSeverity, string> = {
  LOW: '低',
  MEDIUM: '中',
  HIGH: '高',
  CRITICAL: '严重',
}

export const ISSUE_UNIT_SEVERITY_CLASSES: Record<IssueUnitSeverity, string> = {
  LOW: 'bg-slate-100 text-slate-700',
  MEDIUM: 'bg-amber-100 text-amber-800',
  HIGH: 'bg-orange-100 text-orange-800',
  CRITICAL: 'bg-red-100 text-red-700',
}
