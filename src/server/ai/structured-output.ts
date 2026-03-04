import { generateText, Output, type ModelMessage } from 'ai'
import { z, type ZodType } from 'zod'
import { getChatProvider, getStructuredChatModel } from './provider'

interface StructuredTextParams<TSchema extends ZodType> {
  schema: TSchema
  prompt?: string
  system?: string
  messages?: ModelMessage[]
  schemaName?: string
  maxOutputTokens?: number
  shapeHint?: string
  abortSignal?: AbortSignal
}

function compactSchemaNode(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(compactSchemaNode)
  }

  if (!value || typeof value !== 'object') {
    return value
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== '$schema' && key !== 'description' && key !== 'title')
      .map(([key, nestedValue]) => [key, compactSchemaNode(nestedValue)]),
  )
}

function toJsonSchema(schema: ZodType): string {
  return JSON.stringify(compactSchemaNode(z.toJSONSchema(schema)))
}

function buildStructuredOutputInstructions(
  schema: ZodType,
  schemaName = 'response',
  shapeHint?: string,
): string {
  return [
    'Return exactly one JSON object that matches the schema below.',
    'Do not wrap the JSON in markdown fences.',
    'Do not add any explanatory text before or after the JSON.',
    `Schema name: ${schemaName}`,
    shapeHint?.trim() ? shapeHint.trim() : toJsonSchema(schema),
  ].join('\n\n')
}

export function supportsNativeStructuredOutput(): boolean {
  return getChatProvider() !== 'deepseek'
}

export function requiresJsonKeywordHint(): boolean {
  return getChatProvider() === 'qwen'
}

export function withJsonKeywordHint(text: string | undefined): string | undefined {
  if (!requiresJsonKeywordHint()) return text

  const base = text?.trim() ?? ''
  const hint = 'Return valid json only.'

  if (!base) return hint
  if (/\bjson\b/i.test(base)) return base

  return `${base}\n\n${hint}`
}

export function appendStructuredOutputInstructions(
  baseText: string,
  schema: ZodType,
  schemaName?: string,
  shapeHint?: string,
): string {
  const trimmed = baseText.trim()
  const contract = buildStructuredOutputInstructions(schema, schemaName, shapeHint)
  return trimmed ? `${trimmed}\n\n## Output Contract\n${contract}` : contract
}

function extractJsonBlock(text: string): string {
  const trimmed = text.trim()
  if (!trimmed) {
    throw new Error('Model returned empty text')
  }

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim()
  }

  const firstBrace = trimmed.indexOf('{')
  const lastBrace = trimmed.lastIndexOf('}')

  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1)
  }

  return trimmed
}

export function parseStructuredOutputText<TSchema extends ZodType>(
  text: string,
  schema: TSchema,
): z.infer<TSchema> {
  const candidate = extractJsonBlock(text)

  let parsed: unknown
  try {
    parsed = JSON.parse(candidate)
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to parse JSON response: ${detail}`)
  }

  const result = schema.safeParse(parsed)
  if (!result.success) {
    throw new Error(
      `Structured response validation failed: ${result.error.issues
        .map((issue) => `${issue.path.join('.') || 'root'} ${issue.message}`)
        .join('; ')}`,
    )
  }

  return result.data
}

export async function generateStructuredOutput<TSchema extends ZodType>({
  schema,
  prompt,
  system,
  messages,
  schemaName,
  maxOutputTokens,
  shapeHint,
  abortSignal,
}: StructuredTextParams<TSchema>): Promise<z.infer<TSchema>> {
  const model = getStructuredChatModel()
  const promptInput = messages ? { messages } : { prompt: prompt ?? '' }

  if (supportsNativeStructuredOutput()) {
    const { output } = await generateText({
      model,
      output: Output.object({ schema }),
      system: withJsonKeywordHint(system),
      maxOutputTokens,
      abortSignal,
      ...promptInput,
    })

    if (!output) {
      throw new Error('No structured output generated')
    }

    return output as z.infer<TSchema>
  }

  const { text } = await generateText({
    model,
    system: appendStructuredOutputInstructions(system ?? '', schema, schemaName, shapeHint),
    maxOutputTokens,
    abortSignal,
    ...(messages
      ? { messages }
      : {
        prompt: appendStructuredOutputInstructions(
          prompt ?? '',
          schema,
          schemaName,
          shapeHint,
        ),
      }),
  })

  return parseStructuredOutputText(text, schema)
}
