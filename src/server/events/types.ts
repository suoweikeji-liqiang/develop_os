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
  'requirement.testcases.started': { requirementId: string; sourceVersion: number; generatedBy: string }
  'requirement.testcases.completed': { requirementId: string; sourceVersion: number; generatedBy: string; caseCount: number }
  'requirement.testcases.failed': { requirementId: string; sourceVersion: number; generatedBy: string; error: string }
  'requirement.updated': { requirementId: string; updatedBy: string; field: string }
  'conversation.message.saved': { requirementId: string }
  'requirement.version.created': { requirementId: string; version: number; previousVersion: number; createdBy: string }
  'requirement.status.changed': { requirementId: string; from: string; to: string; changedBy: string }
  'requirement.signoff.submitted': { requirementId: string; role: string; userId: string }
  'requirement.signoff.invalidated': { requirementId: string; reason: 'model-updated' }
  'requirement.conflicts.scanned': { requirementId: string; agentId: string; conflictCount: number }
  'requirement.conflict.updated': { requirementId: string; conflictId: string; status: 'OPEN' | 'DISMISSED' | 'RESOLVED'; updatedBy: string }
  'comment.created': { requirementId: string; commentId: string; authorId: string; mentionedUserIds: string[] }
  'notification.created': { userId: string; type: 'MENTION' | 'STATUS_CHANGE' | 'COMMENT'; requirementId: string; commentId?: string }
}
