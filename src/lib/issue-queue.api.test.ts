import { describe, expect, it } from 'vitest'
import {
  buildClarificationConclusionMeta,
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

  it('builds a conclusion sink signal once a clarification-derived issue resolves into a unit', () => {
    const conclusion = buildClarificationConclusionMeta({
      issueType: 'risk',
      issueStatus: 'RESOLVED',
      clarificationCategory: 'RISK',
      callbackNeeded: true,
      primaryRequirementUnit: {
        unitKey: 'RU-03',
        title: '异常兜底',
      },
    })

    expect(conclusion?.label).toBe('风险被确认')
    expect(conclusion?.effectLabel).toBe('改善稳定度判断')
    expect(conclusion?.sinkLabel).toBe('沉淀到 RU-03')
    expect(conclusion?.summary).toContain('RU-03 · 异常兜底')
    expect(conclusion?.summary).toContain('人工确认')
    expect(conclusion?.requiresManualContentUpdate).toBe(true)
  })

  it('marks rejected or sinkless closures as closed without a content sink', () => {
    const conclusion = buildClarificationConclusionMeta({
      issueType: 'ambiguity',
      issueStatus: 'REJECTED',
      clarificationCategory: 'SCOPE',
      callbackNeeded: false,
      primaryRequirementUnit: null,
    })

    expect(conclusion?.label).toBe('仅关闭问题，尚未形成内容沉淀')
    expect(conclusion?.effectLabel).toBe('仍需人工补内容')
    expect(conclusion?.sinkLabel).toBe('尚未形成明确落点')
    expect(conclusion?.nextStep).toContain('补齐')
  })
})
