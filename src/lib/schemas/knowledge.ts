import { z } from 'zod'

export const KnowledgeDocumentSchema = z.object({
  id: z.string(),
  name: z.string(),
  mimeType: z.string(),
  status: z.enum(['PROCESSING', 'READY', 'ERROR']),
  chunkCount: z.number().int().optional(),
  uploadedBy: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export const CodeRepositorySchema = z.object({
  id: z.string(),
  owner: z.string(),
  repo: z.string(),
  lastSyncedAt: z.coerce.date().nullable().optional(),
  addedBy: z.string(),
  createdAt: z.coerce.date(),
})

export const AddCodeRepositoryInputSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  githubToken: z.string().min(1),
})
