import { FiveLayerModelSchema, type FiveLayerModel } from '@/lib/schemas/requirement'
import { eventBus } from '@/server/events/bus'
import { buildCompactStructuringPrompt, buildStructuringPrompt } from './prompt'
import type { RetrievedChunk } from './rag/retrieve'
import { generateStructuredOutput } from './structured-output'
import { getChatProvider } from './provider'
import {
  CompactStructuringDraftSchema,
  COMPACT_STRUCTURING_DRAFT_SHAPE_HINT,
  expandCompactStructuringDraft,
} from './structuring-draft'

const MAX_RETRIES = 3
const DEFAULT_STRUCTURING_TIMEOUT_MS = 15000
const QWEN_STRUCTURING_TIMEOUT_MS = 22000
const COMPACT_STRUCTURING_MAX_OUTPUT_TOKENS = 900
const FULL_STRUCTURING_MAX_OUTPUT_TOKENS = 1600
const FIVE_LAYER_MODEL_SHAPE_HINT = `{
  "goal": {
    "summary": "string",
    "before": "string",
    "after": "string",
    "metrics": ["string"]
  },
  "assumption": {
    "items": [
      {
        "content": "string",
        "confidence": "high | medium | low",
        "rationale": "string"
      }
    ]
  },
  "behavior": {
    "actors": ["string"],
    "actions": [
      {
        "actor": "string",
        "action": "string",
        "precondition": "string (optional)",
        "postcondition": "string (optional)"
      }
    ]
  },
  "scenario": {
    "normal": [{ "name": "string", "steps": ["string"] }],
    "edge": [{ "name": "string", "trigger": "string", "steps": ["string"] }],
    "error": [{ "name": "string", "recovery": "string", "steps": ["string"] }]
  },
  "verifiability": {
    "automated": [{ "criterion": "string", "method": "string" }],
    "manual": [{ "criterion": "string", "reason": "string" }]
  }
}`

function excerptInput(input: string): string {
  const normalized = input.replace(/\s+/g, ' ').trim()
  return normalized.length > 80 ? `${normalized.slice(0, 77)}...` : normalized
}

function parsePositiveInt(value: string | undefined): number | null {
  if (!value) return null

  const parsed = Number.parseInt(value, 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

function buildFallbackModel(input: string): FiveLayerModel {
  const summary = excerptInput(input) || '补全待探索需求'

  return {
    goal: {
      summary,
      before: `当前团队只有一段待澄清的原始描述：${summary}`,
      after: '团队获得一版可编辑、可继续评审的五层需求模型。',
      metrics: [
        '形成可编辑的 Goal / Assumption / Behavior / Scenario / Verifiability 五层结构',
        '至少沉淀 1 条需要验证的核心假设',
        '至少覆盖正常、边界和异常三个场景视角',
      ],
    },
    assumption: {
      items: [
        {
          content: '原始描述代表了一个值得继续澄清和建模的真实需求。',
          confidence: 'medium',
          rationale: '当前只有简短输入，仍需业务上下文来确认优先级和边界。',
        },
        {
          content: '现有输入缺少验收条件、角色权限或失败恢复等关键细节。',
          confidence: 'high',
          rationale: '原始需求尚未给出完整约束，结构化时需要先保留待确认项。',
        },
      ],
    },
    behavior: {
      actors: ['需求提出者', '系统'],
      actions: [
        {
          actor: '需求提出者',
          action: `提交需要继续澄清的需求描述：${summary}`,
          precondition: '已有原始上下文或业务目标',
          postcondition: '系统获得生成第一版模型所需的输入',
        },
        {
          actor: '系统',
          action: '生成第一版结构化模型，并标记待确认假设与场景',
          precondition: '收到需求描述',
          postcondition: '输出可继续编辑和评审的模型草稿',
        },
      ],
    },
    scenario: {
      normal: [
        {
          name: '生成第一版模型',
          steps: [
            '需求提出者提交原始描述',
            '系统生成 Goal、Assumption、Behavior、Scenario、Verifiability 五层草稿',
            '团队基于草稿继续补充边界与验收条件',
          ],
        },
        {
          name: '继续细化模型',
          steps: [
            '团队阅读首版模型',
            '团队补充新的约束、角色和场景',
            '系统保存修订后的模型版本',
          ],
        },
      ],
      edge: [
        {
          name: '输入过于简短',
          trigger: '原始描述无法直接推导出完整验收标准',
          steps: [
            '系统先生成保守的骨架模型',
            '模型中的关键假设保持可编辑状态',
            '团队补充更多上下文后继续完善',
          ],
        },
        {
          name: '上下文存在歧义',
          trigger: '同一描述可能对应多种业务解释',
          steps: [
            '系统记录歧义点为待确认假设',
            '团队比对真实业务流程',
            '在后续对话中收敛到单一解释',
          ],
        },
      ],
      error: [
        {
          name: 'AI 结构化超时',
          recovery: '先回退为可编辑骨架模型，允许团队继续人工完善。',
          steps: [
            '系统尝试调用 AI 生成结构化模型',
            '若在超时时间内未完成则停止等待',
            '系统返回启发式骨架模型并提示后续继续澄清',
          ],
        },
        {
          name: '结构化输出不稳定',
          recovery: '保留首版骨架并等待人工修订或后续重新生成。',
          steps: [
            'AI 返回的结构化 JSON 无法通过校验',
            '系统记录失败并构造基础模型',
            '团队继续在界面中人工修订',
          ],
        },
      ],
    },
    verifiability: {
      automated: [
        {
          criterion: '系统能返回完整的五层模型对象',
          method: 'API 断言返回值包含 goal、assumption、behavior、scenario、verifiability 五个顶层字段',
        },
        {
          criterion: '模型中包含至少一条假设和每类场景',
          method: '对数组字段执行最小数量断言',
        },
      ],
      manual: [
        {
          criterion: '首版模型是否贴近真实业务语义',
          reason: '需要业务方判断摘要、场景和验收标准是否符合实际语境',
        },
        {
          criterion: '启发式骨架中的待确认项是否完整',
          reason: '仍需人工决定哪些假设需要保留、修改或删除',
        },
      ],
    },
  }
}

function shouldUseFallbackModel(error: unknown): boolean {
  if (!(error instanceof Error)) return false

  if (error.message.includes('timed out') || error.message.includes('aborted')) {
    return true
  }

  if (getChatProvider() === 'deepseek') {
    return (
      error.message.includes('Failed to parse JSON response') ||
      error.message.includes('Structured response validation failed')
    )
  }

  return false
}

function shouldUseCompactStructuringDraft(): boolean {
  const provider = getChatProvider()
  return provider === 'qwen' || provider === 'deepseek'
}

function getStructuringTimeoutMs(): number {
  const provider = getChatProvider()

  if (provider === 'qwen') {
    return parsePositiveInt(process.env.QWEN_STRUCTURING_TIMEOUT_MS) ?? QWEN_STRUCTURING_TIMEOUT_MS
  }

  return parsePositiveInt(process.env.STRUCTURING_TIMEOUT_MS) ?? DEFAULT_STRUCTURING_TIMEOUT_MS
}

// Zod 4 schemas work natively with AI SDK 6's Output.object() —
// no jsonSchema() bridge needed. Verified at install time.

export type StructuringResult =
  | { success: true; model: FiveLayerModel; attempts: number }
  | { success: false; error: unknown; attempts: number }

/**
 * Generate a structured five-layer model from natural language input.
 * Retries up to 3 times silently on failure, emitting lifecycle events.
 */
export async function generateStructuredModel(
  input: string,
  requirementId: string,
  userId: string,
  ragContext: RetrievedChunk[] = [],
): Promise<StructuringResult> {
  eventBus.emit('requirement.structuring.started', { requirementId, userId })
  const timeoutMs = getStructuringTimeoutMs()

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const output = shouldUseCompactStructuringDraft()
        ? expandCompactStructuringDraft(
          await generateStructuredOutput({
            schema: CompactStructuringDraftSchema,
            schemaName: 'compact_structuring_draft',
            prompt: buildCompactStructuringPrompt(input, ragContext),
            maxOutputTokens: COMPACT_STRUCTURING_MAX_OUTPUT_TOKENS,
            shapeHint: COMPACT_STRUCTURING_DRAFT_SHAPE_HINT,
            abortSignal: AbortSignal.timeout(timeoutMs),
          }),
        )
        : await generateStructuredOutput({
          schema: FiveLayerModelSchema,
          schemaName: 'five_layer_model',
          prompt: buildStructuringPrompt(input, ragContext),
          maxOutputTokens: FULL_STRUCTURING_MAX_OUTPUT_TOKENS,
          shapeHint: FIVE_LAYER_MODEL_SHAPE_HINT,
          abortSignal: AbortSignal.timeout(timeoutMs),
        })

      eventBus.emit('requirement.structuring.completed', {
        requirementId,
        attempts: attempt,
      })

      return { success: true, model: output, attempts: attempt }
    } catch (error) {
      if (shouldUseFallbackModel(error)) {
        const fallbackModel = buildFallbackModel(input)
        console.warn('[ai] structuring fallback used:', error)

        eventBus.emit('requirement.structuring.completed', {
          requirementId,
          attempts: attempt,
        })

        return { success: true, model: fallbackModel, attempts: attempt }
      }

      if (attempt === MAX_RETRIES) {
        const errorMessage =
          error instanceof Error ? error.message : String(error)

        eventBus.emit('requirement.structuring.failed', {
          requirementId,
          attempts: attempt,
          error: errorMessage,
        })

        return { success: false, error, attempts: attempt }
      }
      // Silent retry — continue loop
    }
  }

  // TypeScript exhaustiveness: unreachable but satisfies return type
  return { success: false, error: new Error('Unexpected retry exit'), attempts: MAX_RETRIES }
}
