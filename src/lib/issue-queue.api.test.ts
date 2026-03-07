import { describe, expect, it } from 'vitest'
import {
  buildConflictProjectionStatusMeta,
  buildClarificationQueueStatusMeta,
  doesClarificationIssueNeedSourceConfirmation,
} from './issue-queue'

describe('clarification issue queue callback rules', () => {
  it('marks eligible clarifications before they enter the issue queue', () => {
    const status = buildClarificationQueueStatusMeta({
      category: 'RISK',
      clarificationStatus: 'OPEN',
    })

    expect(status.state).toBe('eligible_for_issue_queue')
    expect(status.label).toBe('可转入 Issue Queue')
    expect(status.callbackNeeded).toBe(false)
  })

  it('requires source confirmation when the issue is closed but the clarification is not resolved', () => {
    const status = buildClarificationQueueStatusMeta({
      category: 'SCOPE',
      clarificationStatus: 'SKIPPED',
      issueStatus: 'RESOLVED',
    })

    expect(doesClarificationIssueNeedSourceConfirmation({
      clarificationStatus: 'SKIPPED',
      issueStatus: 'RESOLVED',
    })).toBe(true)
    expect(status.state).toBe('closed_needs_confirmation')
    expect(status.callbackNeeded).toBe(true)
    expect(status.summary).toContain('请人工确认')
  })

  it('stops asking for callback once the clarification is resolved', () => {
    const status = buildClarificationQueueStatusMeta({
      category: 'SCOPE',
      clarificationStatus: 'RESOLVED',
      issueStatus: 'RESOLVED',
    })

    expect(status.state).toBe('closed_confirmed')
    expect(status.callbackNeeded).toBe(false)
  })

  it('explains how conflict projection status maps back to the original conflict', () => {
    expect(buildConflictProjectionStatusMeta('OPEN').label).toBe('待在 Issue Queue 处理')
    expect(buildConflictProjectionStatusMeta('RESOLVED').summary).toContain('原 Conflict 已同步为已处理')
    expect(buildConflictProjectionStatusMeta('DISMISSED').summary).toContain('原 Conflict 已同步为已驳回')
  })
})
