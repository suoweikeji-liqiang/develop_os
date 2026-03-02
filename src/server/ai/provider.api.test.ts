import { afterEach, describe, expect, it } from 'vitest'
import {
  getChatProvider,
  getEmbeddingProvider,
  getChatModel,
  getEmbeddingModel,
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

  it('defaults embedding provider to openai', () => {
    process.env.EMBEDDING_PROVIDER = ''
    expect(getEmbeddingProvider()).toBe('openai')
  })

  it('builds chat and embedding models without throwing', () => {
    process.env.AI_PROVIDER = 'deepseek'
    process.env.DEEPSEEK_API_KEY = 'sk-test'
    process.env.EMBEDDING_PROVIDER = 'openai'

    expect(() => getChatModel()).not.toThrow()
    expect(() => getEmbeddingModel()).not.toThrow()
  })
})
