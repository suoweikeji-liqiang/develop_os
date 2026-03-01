import { z } from 'zod'

export const RequirementStatusEnum = z.enum([
  'DRAFT',
  'IN_REVIEW',
  'CONSENSUS',
  'IMPLEMENTING',
  'DONE',
])

export type RequirementStatus = z.infer<typeof RequirementStatusEnum>

const TRANSITIONS: Record<RequirementStatus, readonly RequirementStatus[]> = {
  DRAFT: ['IN_REVIEW'],
  IN_REVIEW: ['CONSENSUS', 'DRAFT'],
  CONSENSUS: ['IMPLEMENTING', 'IN_REVIEW'],
  IMPLEMENTING: ['DONE', 'CONSENSUS'],
  DONE: [],
} as const

export function canTransition(from: RequirementStatus, to: RequirementStatus): boolean {
  return TRANSITIONS[from].includes(to)
}

export function getValidTransitions(current: RequirementStatus): readonly RequirementStatus[] {
  return TRANSITIONS[current]
}

export function assertTransition(from: RequirementStatus, to: RequirementStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid transition: ${from} -> ${to}`)
  }
}
