import { createOpenAI, openai } from '@ai-sdk/openai'

const deepseek = createOpenAI({
  name: 'deepseek',
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com/v1',
})

const qwen = createOpenAI({
  name: 'qwen',
  apiKey: process.env.QWEN_API_KEY,
  baseURL: process.env.QWEN_BASE_URL ?? 'https://dashscope.aliyuncs.com/compatible-mode/v1',
})

type ChatProvider = 'openai' | 'deepseek'
type EmbeddingProvider = 'openai' | 'qwen'

function normalize(value: string | undefined, fallback: string): string {
  return (value ?? fallback).trim().toLowerCase()
}

function hasValue(value: string | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

function parsePositiveInt(value: string | undefined): number | undefined {
  if (!hasValue(value)) return undefined

  const parsed = Number.parseInt(value!, 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined
}

function getEmbeddingDimensions(provider: EmbeddingProvider): number | undefined {
  if (provider === 'qwen') {
    return parsePositiveInt(process.env.QWEN_EMBEDDING_DIMENSIONS) ?? 1536
  }

  return parsePositiveInt(process.env.OPENAI_EMBEDDING_DIMENSIONS)
}

export function getChatProvider(): ChatProvider {
  const configured = normalize(
    process.env.AI_PROVIDER,
    hasValue(process.env.DEEPSEEK_API_KEY) ? 'deepseek' : 'openai',
  )
  return configured === 'deepseek' ? 'deepseek' : 'openai'
}

export function getChatModel() {
  if (getChatProvider() === 'deepseek') {
    return deepseek.chat(process.env.DEEPSEEK_CHAT_MODEL ?? 'deepseek-chat')
  }
  return openai(process.env.OPENAI_CHAT_MODEL ?? 'gpt-4o')
}

export function getEmbeddingProvider(): EmbeddingProvider | null {
  const configured = normalize(
    process.env.EMBEDDING_PROVIDER,
    hasValue(process.env.QWEN_API_KEY)
      ? 'qwen'
      : hasValue(process.env.OPENAI_API_KEY)
        ? 'openai'
        : '',
  )

  if (configured === 'qwen') {
    return hasValue(process.env.QWEN_API_KEY) ? 'qwen' : null
  }

  if (configured === 'openai') {
    return hasValue(process.env.OPENAI_API_KEY) ? 'openai' : null
  }

  return null
}

export function isEmbeddingConfigured(): boolean {
  return getEmbeddingProvider() !== null
}

export function getEmbeddingModelConfig() {
  const provider = getEmbeddingProvider()
  if (!provider) return null

  const dimensions = getEmbeddingDimensions(provider)
  const providerOptions = dimensions
    ? { openai: { dimensions } satisfies { dimensions: number } }
    : undefined

  if (provider === 'qwen') {
    return {
      model: qwen.embeddingModel(process.env.QWEN_EMBEDDING_MODEL ?? 'text-embedding-v4'),
      providerOptions,
    }
  }

  return {
    model: openai.embeddingModel(
      process.env.OPENAI_EMBEDDING_MODEL ?? 'text-embedding-3-small',
    ),
    providerOptions,
  }
}

export function getEmbeddingModel() {
  const config = getEmbeddingModelConfig()
  if (!config) {
    throw new Error('Embedding provider is not configured')
  }

  return config.model
}
