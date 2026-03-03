import { afterEach, describe, expect, it } from 'vitest'
import {
  getChatModel,
  getChatProvider,
  getEmbeddingModel,
  getEmbeddingModelConfig,
  getEmbeddingProvider,
  isEmbeddingConfigured,
} from '@/server/ai/provider'

const ORIGINAL_ENV = { ...process.env }

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
})

describe('AI provider selection', () => {
  it('defaults chat provider to deepseek when DEEPSEEK_API_KEY exists', () => {
    delete process.env.AI_PROVIDER
    process.env.DEEPSEEK_API_KEY = 'sk-test'
    expect(getChatProvider()).toBe('deepseek')
  })

  it('uses openai chat when explicitly configured', () => {
    process.env.AI_PROVIDER = 'openai'
    process.env.DEEPSEEK_API_KEY = 'sk-test'
    expect(getChatProvider()).toBe('openai')
  })

  it('defaults chat provider to qwen when only QWEN_API_KEY exists', () => {
    delete process.env.AI_PROVIDER
    delete process.env.DEEPSEEK_API_KEY
    delete process.env.OPENAI_API_KEY
    process.env.QWEN_API_KEY = 'sk-qwen'

    expect(getChatProvider()).toBe('qwen')
  })

  it('uses the chat-completions adapter for deepseek', () => {
    process.env.AI_PROVIDER = 'deepseek'
    process.env.DEEPSEEK_API_KEY = 'sk-test'

    expect(getChatModel().provider).toBe('deepseek.chat')
  })

  it('uses the chat-completions adapter for qwen', () => {
    process.env.AI_PROVIDER = 'qwen'
    process.env.QWEN_API_KEY = 'sk-qwen'

    expect(getChatModel().provider).toBe('qwen.chat')
  })

  it('defaults embedding provider to none when no key exists', () => {
    process.env.EMBEDDING_PROVIDER = ''
    delete process.env.OPENAI_API_KEY
    delete process.env.QWEN_API_KEY

    expect(getEmbeddingProvider()).toBeNull()
    expect(isEmbeddingConfigured()).toBe(false)
  })

  it('supports qwen embeddings through the openai-compatible endpoint', () => {
    process.env.EMBEDDING_PROVIDER = 'qwen'
    process.env.QWEN_API_KEY = 'sk-qwen'
    process.env.QWEN_EMBEDDING_DIMENSIONS = '1536'

    const config = getEmbeddingModelConfig()

    expect(getEmbeddingProvider()).toBe('qwen')
    expect(isEmbeddingConfigured()).toBe(true)
    expect(config?.providerOptions).toEqual({ openai: { dimensions: 1536 } })
  })

  it('builds chat and embedding models without throwing', () => {
    process.env.AI_PROVIDER = 'deepseek'
    process.env.DEEPSEEK_API_KEY = 'sk-test'
    process.env.EMBEDDING_PROVIDER = 'openai'
    process.env.OPENAI_API_KEY = 'sk-openai'

    expect(() => getChatModel()).not.toThrow()
    expect(() => getEmbeddingModel()).not.toThrow()
  })

  it('builds qwen chat model without throwing', () => {
    process.env.AI_PROVIDER = 'qwen'
    process.env.QWEN_API_KEY = 'sk-qwen'

    expect(() => getChatModel()).not.toThrow()
  })
})
