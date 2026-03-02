import { createOpenAI, openai } from '@ai-sdk/openai'

const deepseek = createOpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com/v1',
})

function normalize(value: string | undefined, fallback: string): string {
  return (value ?? fallback).trim().toLowerCase()
}

export function getChatProvider(): 'openai' | 'deepseek' {
  const configured = normalize(
    process.env.AI_PROVIDER,
    process.env.DEEPSEEK_API_KEY ? 'deepseek' : 'openai',
  )
  return configured === 'deepseek' ? 'deepseek' : 'openai'
}

export function getChatModel() {
  if (getChatProvider() === 'deepseek') {
    return deepseek(process.env.DEEPSEEK_CHAT_MODEL ?? 'deepseek-chat')
  }
  return openai(process.env.OPENAI_CHAT_MODEL ?? 'gpt-4o')
}

export function getEmbeddingProvider(): 'openai' | 'deepseek' {
  const configured = normalize(process.env.EMBEDDING_PROVIDER, 'openai')
  return configured === 'deepseek' ? 'deepseek' : 'openai'
}

export function getEmbeddingModel() {
  if (getEmbeddingProvider() === 'deepseek') {
    return deepseek.embeddingModel(
      process.env.DEEPSEEK_EMBEDDING_MODEL ?? 'text-embedding-3-small',
    )
  }
  return openai.embeddingModel(
    process.env.OPENAI_EMBEDDING_MODEL ?? 'text-embedding-3-small',
  )
}
