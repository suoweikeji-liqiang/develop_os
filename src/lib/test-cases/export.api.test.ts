import { describe, expect, it } from 'vitest'
import { buildTestCaseCsv, buildTestCaseMarkdown } from './export'
import type { TestCaseSuite } from '@/lib/schemas/test-case'

const suite: TestCaseSuite = {
  summary: '覆盖审批主流程与异常恢复。',
  coverageFocus: ['审批成功主流程', '审批接口失败恢复'],
  risks: ['审批权限边界仍需进一步确认'],
  cases: [
    {
      id: 'TC-001',
      title: '审批成功主流程',
      type: 'functional',
      priority: 'P0',
      objective: '验证审批成功后状态和通知都正确',
      preconditions: ['审批单已创建', '审批人有权限'],
      steps: ['提交审批单', '审批人批准申请'],
      expectedResults: ['状态更新为 approved', '申请人收到通知'],
      automationCandidate: true,
      relatedLayers: ['goal', 'behavior', 'scenario', 'verifiability'],
      sourceSignals: ['审批成功主流程'],
    },
  ],
}

describe('test case export', () => {
  it('renders markdown with summary, risks, and traceability', () => {
    const markdown = buildTestCaseMarkdown({
      requirementTitle: '线上发票审批',
      sourceRequirementVersion: 3,
      currentRequirementVersion: 4,
      createdAt: '2026-03-04T12:00:00.000Z',
      suite,
    })

    expect(markdown).toContain('# 测试用例资产：线上发票审批')
    expect(markdown).toContain('## Summary')
    expect(markdown).toContain('## Risks')
    expect(markdown).toContain('## TC-001 审批成功主流程')
    expect(markdown).toContain('### Traceability')
  })

  it('renders csv rows with escaped cells', () => {
    const csv = buildTestCaseCsv({
      requirementTitle: '线上发票审批',
      sourceRequirementVersion: 3,
      suite: {
        ...suite,
        cases: [
          {
            ...suite.cases[0],
            objective: '验证审批成功后状态, 通知都正确',
          },
        ],
      },
    })

    const lines = csv.split('\n')
    expect(lines[0]).toContain('requirement_title')
    expect(lines[1]).toContain('线上发票审批')
    expect(lines[1]).toContain('"验证审批成功后状态, 通知都正确"')
  })
})
