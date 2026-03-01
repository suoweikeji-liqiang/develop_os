import type { RequirementStatus } from './status-machine'

export const STATUS_LABELS: Record<RequirementStatus, string> = {
  DRAFT: '草稿',
  IN_REVIEW: '评审中',
  CONSENSUS: '共识达成',
  IMPLEMENTING: '实现中',
  DONE: '完成',
}

export const STATUS_COLORS: Record<RequirementStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  IN_REVIEW: 'bg-yellow-100 text-yellow-800',
  CONSENSUS: 'bg-blue-100 text-blue-800',
  IMPLEMENTING: 'bg-purple-100 text-purple-800',
  DONE: 'bg-green-100 text-green-800',
}
