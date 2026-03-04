import {
  TestCaseSuiteSchema,
  type TestCase,
  type TestCaseSuite,
} from '@/lib/schemas/test-case'
import type { FiveLayerModel } from '@/lib/schemas/requirement'
import { eventBus } from '@/server/events/bus'
import { generateStructuredOutput } from './structured-output'
import { getChatProvider } from './provider'
import type { RetrievedChunk } from './rag/retrieve'
import {
  COMPACT_TEST_CASE_DRAFT_SHAPE_HINT,
  CompactTestCaseSuiteDraftSchema,
  expandCompactTestCaseDraft,
} from './test-case-draft'

const MAX_RETRIES = 2
const DEFAULT_TIMEOUT_MS = 18000
const QWEN_TIMEOUT_MS = 24000
const FULL_MAX_OUTPUT_TOKENS = 1800
const COMPACT_MAX_OUTPUT_TOKENS = 950

const TEST_CASE_SUITE_SHAPE_HINT = `{
  "summary": "string",
  "coverageFocus": ["string"],
  "risks": ["string"],
  "cases": [
    {
      "id": "TC-001",
      "title": "string",
      "type": "functional | edge | error | permission | integration | manual",
      "priority": "P0 | P1 | P2",
      "objective": "string",
      "preconditions": ["string"],
      "steps": ["string"],
      "expectedResults": ["string"],
      "automationCandidate": true,
      "relatedLayers": ["goal | assumption | behavior | scenario | verifiability"],
      "sourceSignals": ["string"]
    }
  ]
}`

function parsePositiveInt(value: string | undefined): number | null {
  if (!value) return null

  const parsed = Number.parseInt(value, 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

function getTimeoutMs(): number {
  if (getChatProvider() === 'qwen') {
    return parsePositiveInt(process.env.TEST_CASE_GENERATION_TIMEOUT_MS) ?? QWEN_TIMEOUT_MS
  }

  return parsePositiveInt(process.env.TEST_CASE_GENERATION_TIMEOUT_MS) ?? DEFAULT_TIMEOUT_MS
}

function formatRagContext(ragContext: RetrievedChunk[]): string {
  if (ragContext.length === 0) return '无额外上下文。'

  return ragContext
    .map((chunk, index) => {
      const excerpt = chunk.content.length > 400
        ? `${chunk.content.slice(0, 397)}...`
        : chunk.content
      return `[${index + 1}] ${chunk.sourceName} (${chunk.sourceType})\n${excerpt}`
    })
    .join('\n\n---\n\n')
}

function buildPrompt(title: string, rawInput: string, model: FiveLayerModel, ragContext: RetrievedChunk[]): string {
  return `你是资深测试设计负责人。请基于当前需求模型，生成一组可直接用于评审和执行的测试用例资产。

## Requirement Title
${title}

## Raw Input
${rawInput}

## Five-layer Model
\`\`\`json
${JSON.stringify(model, null, 2)}
\`\`\`

## Supporting Context
${formatRagContext(ragContext)}

## Task
输出一组覆盖主流程、边界、异常、权限/角色以及关键人工验证点的测试用例。

## Rules
- 输出语言必须与需求原始输入保持一致；原始输入为中文时请输出中文。
- 优先覆盖高风险路径，而不是机械穷举。
- 每条用例必须能够追溯到具体的目标、行为、场景或验收标准。
- 对适合自动化的用例，\`automationCandidate\` 设为 true；确实需要人工判断的设为 false。
- \`sourceSignals\` 必须写明它来自哪条场景、动作、假设或验收标准。
- 用例数量控制在 6 到 10 条之间，避免空泛重复。
- 如果需求缺少关键信息，仍然生成测试用例，但要在 \`risks\` 中明确指出。`
}

function buildCompactPrompt(title: string, rawInput: string, model: FiveLayerModel, ragContext: RetrievedChunk[]): string {
  return `你是资深测试设计负责人。请先输出一个精简版测试用例草稿，后续系统会补全 id、前置条件、追踪字段。

## Requirement Title
${title}

## Raw Input
${rawInput}

## Five-layer Model
\`\`\`json
${JSON.stringify(model, null, 2)}
\`\`\`

## Supporting Context
${formatRagContext(ragContext)}

## Task
输出 4 到 7 条最值得优先执行的测试用例草稿，覆盖主流程、边界、异常、权限/角色或人工验收。

## Rules
- 输出语言必须与需求原始输入保持一致；原始输入为中文时请输出中文。
- \`anchors\` 必须引用需求模型中的短语，尽量直接复用场景名、触发条件、动作描述、假设内容或验收标准，不要重新发明模糊表述。
- 只保留对测试设计真正必要的字段，不要补充 id、relatedLayers、sourceSignals 或 preconditions。
- 优先覆盖高风险路径，不要机械穷举。`
}

function shouldUseCompactDraft(): boolean {
  const provider = getChatProvider()
  return provider === 'qwen' || provider === 'deepseek'
}

function shouldUseFallback(error: unknown): boolean {
  if (!(error instanceof Error)) return false

  if (error.message.includes('timed out') || error.message.includes('aborted')) {
    return true
  }

  if (getChatProvider() === 'deepseek') {
    return (
      error.message.includes('Failed to parse JSON response')
      || error.message.includes('Structured response validation failed')
    )
  }

  return false
}

function compactText(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function buildFallbackSuite(title: string, model: FiveLayerModel): TestCaseSuite {
  const cases: TestCase[] = []
  let counter = 1

  const nextId = () => `TC-${String(counter++).padStart(3, '0')}`

  for (const scenario of model.scenario.normal.slice(0, 2)) {
    cases.push({
      id: nextId(),
      title: scenario.name,
      type: 'functional',
      priority: 'P0',
      objective: compactText(`验证主流程场景“${scenario.name}”能够达成 ${model.goal.summary}`),
      preconditions: [compactText(model.goal.before)],
      steps: scenario.steps.map((step) => compactText(step)),
      expectedResults: [
        compactText(model.goal.after),
        ...model.verifiability.automated.slice(0, 1).map((item) => compactText(item.criterion)),
      ],
      automationCandidate: true,
      relatedLayers: ['goal', 'scenario', 'behavior', 'verifiability'],
      sourceSignals: [`normal scenario: ${scenario.name}`],
    })
  }

  for (const scenario of model.scenario.edge.slice(0, 2)) {
    cases.push({
      id: nextId(),
      title: scenario.name,
      type: 'edge',
      priority: 'P1',
      objective: compactText(`验证边界场景“${scenario.name}”在触发条件 ${scenario.trigger} 下的系统表现`),
      preconditions: [compactText(`触发条件：${scenario.trigger}`)],
      steps: scenario.steps.map((step) => compactText(step)),
      expectedResults: [
        '系统能够维持正确状态且不偏离预期业务边界。',
      ],
      automationCandidate: true,
      relatedLayers: ['scenario', 'behavior', 'verifiability'],
      sourceSignals: [`edge scenario: ${scenario.name}`, `trigger: ${scenario.trigger}`],
    })
  }

  for (const scenario of model.scenario.error.slice(0, 2)) {
    cases.push({
      id: nextId(),
      title: scenario.name,
      type: 'error',
      priority: 'P0',
      objective: compactText(`验证异常场景“${scenario.name}”出现后系统能按预期恢复`),
      preconditions: [compactText(`恢复策略：${scenario.recovery}`)],
      steps: scenario.steps.map((step) => compactText(step)),
      expectedResults: [
        compactText(`系统执行恢复策略：${scenario.recovery}`),
      ],
      automationCandidate: true,
      relatedLayers: ['scenario', 'verifiability'],
      sourceSignals: [`error scenario: ${scenario.name}`, `recovery: ${scenario.recovery}`],
    })
  }

  for (const item of model.verifiability.manual.slice(0, 2)) {
    cases.push({
      id: nextId(),
      title: item.criterion,
      type: 'manual',
      priority: 'P2',
      objective: compactText(`人工确认：${item.criterion}`),
      preconditions: ['测试环境已完成对应业务流配置。'],
      steps: [
        '按业务主流程完成对应操作。',
        '人工检查页面、提示信息和业务结果。',
      ],
      expectedResults: [compactText(item.criterion)],
      automationCandidate: false,
      relatedLayers: ['verifiability', 'goal'],
      sourceSignals: [`manual criterion: ${item.criterion}`],
    })
  }

  const dedupedCases = cases.slice(0, 8)
  const fallbackCases: TestCase[] = [
    {
      id: nextId(),
      title: `${title} 基础主流程`,
      type: 'functional',
      priority: 'P0',
      objective: model.goal.summary,
      preconditions: [compactText(model.goal.before)],
      steps: ['根据当前五层模型执行主流程。'],
      expectedResults: [compactText(model.goal.after)],
      automationCandidate: true,
      relatedLayers: ['goal', 'scenario', 'verifiability'],
      sourceSignals: ['fallback-generated coverage'],
    },
    ...dedupedCases,
  ]

  return {
    summary: `围绕“${title}”生成的基础测试用例集，覆盖主流程、边界、异常与人工验收。`,
    coverageFocus: [
      model.goal.summary,
      ...model.behavior.actions.slice(0, 2).map((item) => compactText(`${item.actor}: ${item.action}`)),
    ].filter(Boolean),
    risks: [
      ...model.assumption.items
        .filter((item) => item.confidence !== 'high')
        .slice(0, 3)
        .map((item) => compactText(`待验证假设：${item.content}`)),
      ...model.verifiability.manual
        .slice(0, 2)
        .map((item) => compactText(`人工判断项：${item.reason}`)),
    ].filter(Boolean),
    cases: (dedupedCases.length >= 3 ? dedupedCases : fallbackCases).slice(0, 8),
  }
}

export type TestCaseGenerationResult =
  | { success: true; suite: TestCaseSuite; attempts: number; usedFallback: boolean }
  | { success: false; error: unknown; attempts: number }

export async function generateRequirementTestCaseSuite(params: {
  requirementId: string
  title: string
  rawInput: string
  model: FiveLayerModel
  sourceVersion: number
  userId: string
  ragContext?: RetrievedChunk[]
}): Promise<TestCaseGenerationResult> {
  const { requirementId, title, rawInput, model, sourceVersion, userId } = params
  const ragContext = params.ragContext ?? []

  eventBus.emit('requirement.testcases.started', {
    requirementId,
    sourceVersion,
    generatedBy: userId,
  })

  const timeoutMs = getTimeoutMs()

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const suite = shouldUseCompactDraft()
        ? expandCompactTestCaseDraft(
          await generateStructuredOutput({
            schema: CompactTestCaseSuiteDraftSchema,
            schemaName: 'compact_requirement_test_case_suite',
            prompt: buildCompactPrompt(title, rawInput, model, ragContext),
            maxOutputTokens: COMPACT_MAX_OUTPUT_TOKENS,
            shapeHint: COMPACT_TEST_CASE_DRAFT_SHAPE_HINT,
            abortSignal: AbortSignal.timeout(timeoutMs),
          }),
          model,
        )
        : await generateStructuredOutput({
          schema: TestCaseSuiteSchema,
          schemaName: 'requirement_test_case_suite',
          prompt: buildPrompt(title, rawInput, model, ragContext),
          maxOutputTokens: FULL_MAX_OUTPUT_TOKENS,
          shapeHint: TEST_CASE_SUITE_SHAPE_HINT,
          abortSignal: AbortSignal.timeout(timeoutMs),
        })

      eventBus.emit('requirement.testcases.completed', {
        requirementId,
        sourceVersion,
        generatedBy: userId,
        caseCount: suite.cases.length,
      })

      return { success: true, suite, attempts: attempt, usedFallback: false }
    } catch (error) {
      if (shouldUseFallback(error)) {
        const suite = buildFallbackSuite(title, model)
        console.warn('[ai] test-case fallback used:', error)

        eventBus.emit('requirement.testcases.completed', {
          requirementId,
          sourceVersion,
          generatedBy: userId,
          caseCount: suite.cases.length,
        })

        return { success: true, suite, attempts: attempt, usedFallback: true }
      }

      if (attempt === MAX_RETRIES) {
        const message = error instanceof Error ? error.message : String(error)
        eventBus.emit('requirement.testcases.failed', {
          requirementId,
          sourceVersion,
          generatedBy: userId,
          error: message,
        })
        return { success: false, error, attempts: attempt }
      }
    }
  }

  return {
    success: false,
    error: new Error('Unexpected test-case generation exit'),
    attempts: MAX_RETRIES,
  }
}
