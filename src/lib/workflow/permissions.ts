export const WORKFLOW_REVIEWER_ROLES = ['PRODUCT', 'DEV', 'TEST', 'UI'] as const

export type WorkflowReviewerRole = (typeof WORKFLOW_REVIEWER_ROLES)[number]

export function hasWorkflowReviewerRole(roles: readonly string[]): boolean {
  return roles.some((role) =>
    WORKFLOW_REVIEWER_ROLES.includes(role as WorkflowReviewerRole),
  )
}

export function canManageRequirementWorkflow(input: {
  roles: readonly string[]
  isAdmin?: boolean
}): boolean {
  return Boolean(input.isAdmin) || hasWorkflowReviewerRole(input.roles)
}
