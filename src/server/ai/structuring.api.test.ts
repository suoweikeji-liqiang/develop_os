import { describe, expect, it } from 'vitest'
import { FiveLayerModelSchema } from '@/lib/schemas/requirement'
import {
  CompactStructuringDraftSchema,
  expandCompactStructuringDraft,
} from '@/server/ai/structuring-draft'

describe('compact structuring draft expansion', () => {
  it('expands a compact draft into a valid five-layer model', () => {
    const draft = CompactStructuringDraftSchema.parse({
      summary: '让产品团队快速完成需求澄清',
      before: '需求描述分散在聊天和文档中，难以直接进入评审',
      after: '团队可以看到一版结构化模型并继续协作补充',
      actors: ['产品经理', '系统'],
      metrics: ['首版模型 15 秒内生成', '评审前置沟通减少'],
      assumptions: [
        { content: '需求输入已经包含核心目标', confidence: 'medium' },
        { content: '团队愿意基于首版模型继续补充', confidence: 'high' },
      ],
      actions: [
        { actor: '产品经理', action: '提交原始需求描述' },
        { actor: '系统', action: '提炼目标与关键流程' },
        { actor: '团队', action: '补充边界与验证条件' },
      ],
      scenarios: {
        normal: [
          {
            name: '生成首版模型',
            steps: ['产品经理提交需求', '系统输出结构化草稿', '团队进入评审'],
          },
        ],
        edge: [
          {
            name: '输入信息偏少',
            trigger: '原始需求只有一句话',
            steps: ['系统提炼最小可用草稿', '团队继续补充上下文'],
          },
        ],
        error: [
          {
            name: '结构化中断',
            recovery: '保留当前草稿并允许重新生成',
            steps: ['系统检测失败', '系统返回可编辑草稿', '团队稍后重试'],
          },
        ],
      },
      automatedChecks: ['结构化接口返回完整模型', '模型包含至少一条假设'],
      manualChecks: ['首版摘要是否贴近真实业务'],
    })

    const model = expandCompactStructuringDraft(draft)

    expect(() => FiveLayerModelSchema.parse(model)).not.toThrow()
    expect(model.behavior.actors).toEqual(['产品经理', '系统', '团队'])
    expect(model.behavior.actions[0]?.precondition).toContain('让产品团队快速完成需求澄清')
    expect(model.verifiability.automated[0]?.method).toContain('接口')
    expect(model.assumption.items[0]?.rationale).toContain('需求输入已经包含核心目标')
  })
})
