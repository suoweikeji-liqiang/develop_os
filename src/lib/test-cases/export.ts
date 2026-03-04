import type { TestCaseSuite } from '@/lib/schemas/test-case'

interface ExportParams {
  requirementTitle: string
  sourceRequirementVersion: number
  suite: TestCaseSuite
  createdAt?: string
  currentRequirementVersion?: number | null
}

function formatDate(value: string | undefined): string | null {
  if (!value) return null
  return new Date(value).toLocaleString('zh-CN')
}

function joinInline(values: string[]): string {
  return values.map((value) => value.replace(/\s+/g, ' ').trim()).filter(Boolean).join(' | ')
}

function escapeCsv(value: string): string {
  const normalized = value.replace(/\r?\n/g, ' ').trim()
  if (/[",]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`
  }
  return normalized
}

export function buildTestCaseMarkdown(params: ExportParams): string {
  const {
    requirementTitle,
    sourceRequirementVersion,
    suite,
    createdAt,
    currentRequirementVersion,
  } = params

  const metaLines = [
    `- 需求标题：${requirementTitle}`,
    `- 用例基于版本：v${sourceRequirementVersion}`,
    currentRequirementVersion ? `- 当前需求版本：v${currentRequirementVersion}` : null,
    createdAt ? `- 生成时间：${formatDate(createdAt)}` : null,
  ].filter(Boolean)

  const riskSection = suite.risks.length > 0
    ? ['## Risks', ...suite.risks.map((item) => `- ${item}`), ''].join('\n')
    : ''

  const caseSections = suite.cases.map((item) => [
    `## ${item.id} ${item.title}`,
    '',
    `- 类型：${item.type}`,
    `- 优先级：${item.priority}`,
    `- 自动化候选：${item.automationCandidate ? '是' : '否'}`,
    `- 关联层：${item.relatedLayers.join(', ')}`,
    '',
    '### Objective',
    item.objective,
    '',
    '### Preconditions',
    ...item.preconditions.map((line) => `- ${line}`),
    '',
    '### Steps',
    ...item.steps.map((line, index) => `${index + 1}. ${line}`),
    '',
    '### Expected Results',
    ...item.expectedResults.map((line) => `- ${line}`),
    '',
    '### Traceability',
    ...item.sourceSignals.map((line) => `- ${line}`),
    '',
  ].join('\n'))

  return [
    `# 测试用例资产：${requirementTitle}`,
    '',
    ...metaLines,
    '',
    '## Summary',
    suite.summary,
    '',
    '## Coverage Focus',
    ...suite.coverageFocus.map((item) => `- ${item}`),
    '',
    riskSection,
    ...caseSections,
  ].filter(Boolean).join('\n')
}

export function buildTestCaseCsv(params: ExportParams): string {
  const {
    requirementTitle,
    sourceRequirementVersion,
    suite,
    createdAt,
    currentRequirementVersion,
  } = params

  const headers = [
    'requirement_title',
    'source_requirement_version',
    'current_requirement_version',
    'suite_created_at',
    'suite_summary',
    'case_id',
    'case_title',
    'case_type',
    'priority',
    'automation_candidate',
    'objective',
    'preconditions',
    'steps',
    'expected_results',
    'related_layers',
    'source_signals',
  ]

  const rows = suite.cases.map((item) => [
    requirementTitle,
    String(sourceRequirementVersion),
    currentRequirementVersion ? String(currentRequirementVersion) : '',
    formatDate(createdAt) ?? '',
    suite.summary,
    item.id,
    item.title,
    item.type,
    item.priority,
    item.automationCandidate ? 'true' : 'false',
    item.objective,
    joinInline(item.preconditions),
    joinInline(item.steps),
    joinInline(item.expectedResults),
    joinInline(item.relatedLayers),
    joinInline(item.sourceSignals),
  ])

  return [
    headers.join(','),
    ...rows.map((row) => row.map((value) => escapeCsv(value)).join(',')),
  ].join('\n')
}
