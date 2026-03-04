import { afterEach, describe, expect, it, vi } from 'vitest'
import { TestCaseSuiteSchema } from '@/lib/schemas/test-case'
import type { FiveLayerModel } from '@/lib/schemas/requirement'

const generateStructuredOutputMock = vi.fn()

vi.mock('@/server/ai/structured-output', () => ({
  generateStructuredOutput: generateStructuredOutputMock,
}))

vi.mock('@/server/ai/provider', () => ({
  getChatProvider: () => 'qwen',
}))

const sampleModel: FiveLayerModel = {
  goal: {
    summary: '让用户快速完成发票审批',
    before: '审批流程需要线下确认',
    after: '审批过程在线完成且状态可追踪',
    metrics: ['审批完成时间缩短 50%'],
  },
  assumption: {
    items: [
      {
        content: '审批人具备系统访问权限',
        confidence: 'medium',
        rationale: '当前账号体系仍在整理',
      },
    ],
  },
  behavior: {
    actors: ['申请人', '审批人', '系统'],
    actions: [
      {
        actor: '申请人',
        action: '提交发票审批申请',
        precondition: '发票信息已填写完整',
        postcondition: '系统创建审批单',
      },
      {
        actor: '审批人',
        action: '批准或驳回审批申请',
        precondition: '审批单处于待审批状态',
        postcondition: '审批结果被记录',
      },
    ],
  },
  scenario: {
    normal: [
      {
        name: '审批成功',
        steps: ['申请人提交审批', '审批人批准申请', '系统通知申请人'],
      },
    ],
    edge: [
      {
        name: '超过金额阈值',
        trigger: '发票金额超出普通审批上限',
        steps: ['系统提示升级审批', '审批单进入更高级别审核'],
      },
    ],
    error: [
      {
        name: '审批接口失败',
        recovery: '系统回滚状态并提示稍后重试',
        steps: ['审批人提交审批结果', '系统调用审批接口失败', '系统记录失败日志'],
      },
    ],
  },
  verifiability: {
    automated: [
      {
        criterion: '审批成功后状态应更新为 approved',
        method: '接口断言审批单状态字段',
      },
    ],
    manual: [
      {
        criterion: '审批流页面状态变化清晰可见',
        reason: '涉及页面视觉反馈和提示文案判断',
      },
    ],
  },
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('test case generation', () => {
  it('falls back to a deterministic suite when AI times out', async () => {
    generateStructuredOutputMock.mockRejectedValueOnce(new Error('request timed out'))

    const { generateRequirementTestCaseSuite } = await import('./test-case-generation')

    const result = await generateRequirementTestCaseSuite({
      requirementId: 'req-1',
      title: '发票审批',
      rawInput: '需要一个线上发票审批流程。',
      model: sampleModel,
      sourceVersion: 3,
      userId: 'user-1',
      ragContext: [],
    })

    expect(result.success).toBe(true)
    if (!result.success) return

    expect(result.usedFallback).toBe(true)
    expect(() => TestCaseSuiteSchema.parse(result.suite)).not.toThrow()
    expect(result.suite.cases.length).toBeGreaterThanOrEqual(3)
  })

  it('returns the model-produced suite when AI generation succeeds', async () => {
    generateStructuredOutputMock.mockResolvedValueOnce({
      summary: '聚焦审批主流程与异常恢复的测试用例集。',
      coverageFocus: ['审批成功', '审批接口失败'],
      risks: ['超过金额阈值的审批策略仍需业务确认'],
      cases: [
        {
          title: '审批成功主流程',
          type: 'functional',
          priority: 'P0',
          objective: '验证审批成功后状态与通知链路正确',
          anchors: ['审批成功', '提交发票审批申请'],
          steps: ['申请人提交审批', '审批人批准申请'],
          expectedResults: ['审批单状态更新为 approved', '申请人收到通知'],
          automationCandidate: true,
        },
        {
          title: '超过金额阈值时升级审批',
          type: 'edge',
          priority: 'P1',
          objective: '验证高金额发票进入升级审批',
          anchors: ['超过金额阈值'],
          steps: ['提交高金额审批单'],
          expectedResults: ['系统提示升级审批'],
          automationCandidate: true,
        },
        {
          title: '审批页面状态反馈',
          type: 'manual',
          priority: 'P2',
          objective: '人工确认审批状态反馈是否清晰',
          anchors: ['审批流页面状态变化清晰可见'],
          steps: ['执行一次审批并观察页面状态变化'],
          expectedResults: ['用户能清晰看到审批状态变化'],
          automationCandidate: false,
        },
        {
          title: '审批接口失败恢复',
          type: 'error',
          priority: 'P0',
          objective: '验证审批接口失败后系统能保留状态并提示重试',
          anchors: ['审批接口失败', '系统回滚状态并提示稍后重试'],
          steps: ['审批人提交审批结果', '模拟审批接口失败'],
          expectedResults: ['系统记录失败日志', '用户看到稍后重试提示'],
          automationCandidate: true,
        },
      ],
    })

    const { generateRequirementTestCaseSuite } = await import('./test-case-generation')

    const result = await generateRequirementTestCaseSuite({
      requirementId: 'req-2',
      title: '发票审批',
      rawInput: '需要一个线上发票审批流程。',
      model: sampleModel,
      sourceVersion: 4,
      userId: 'user-2',
      ragContext: [],
    })

    expect(result.success).toBe(true)
    if (!result.success) return

    expect(result.usedFallback).toBe(false)
    expect(result.suite.summary).toContain('测试用例集')
    expect(result.suite.cases[0]?.id).toBe('TC-001')
    expect(result.suite.cases[0]?.sourceSignals.length).toBeGreaterThan(0)
    expect(() => TestCaseSuiteSchema.parse(result.suite)).not.toThrow()
  })
})
