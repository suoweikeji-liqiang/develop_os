export interface EventMap {
  'user.registered': { userId: string; email: string }
  'user.invited': { inviteId: string; email: string; roles: string[] }
  'user.role.assigned': { userId: string; role: string; assignedBy: string }
  'user.role.removed': { userId: string; role: string; removedBy: string }
  'session.created': { sessionId: string; userId: string }
  'session.deleted': { sessionId: string; userId: string }
  'requirement.created': { requirementId: string; createdBy: string }
}
