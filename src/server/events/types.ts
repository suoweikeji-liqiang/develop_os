export interface EventMap {
  'user.registered': { userId: string; email: string }
  'user.invited': { inviteId: string; email: string; roles: string[] }
  'user.role.assigned': { userId: string; role: string; assignedBy: string }
  'user.role.removed': { userId: string; role: string; removedBy: string }
  'session.created': { sessionId: string; userId: string }
  'session.deleted': { sessionId: string; userId: string }
  'requirement.created': { requirementId: string; createdBy: string }
  'requirement.structuring.started': { requirementId: string; userId: string }
  'requirement.structuring.completed': { requirementId: string; attempts: number }
  'requirement.structuring.failed': { requirementId: string; attempts: number; error: string }
  'requirement.updated': { requirementId: string; updatedBy: string; field: string }
}
