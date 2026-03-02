-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Document metadata (no binary content stored - text extracted on upload)
CREATE TABLE "KnowledgeDocument" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PROCESSING',
  "chunkCount" INTEGER,
  "uploadedBy" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- GitHub repository connections
CREATE TABLE "CodeRepository" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  owner TEXT NOT NULL,
  repo TEXT NOT NULL,
  "githubTokenEncrypted" TEXT NOT NULL,
  "lastSyncedAt" TIMESTAMPTZ,
  "addedBy" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(owner, repo, "addedBy")
);

-- Text chunks with vector embeddings (shared by document, code, history sources)
CREATE TABLE "KnowledgeChunk" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "sourceType" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "sourceName" TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536) NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- HNSW index for fast cosine similarity search (preferred over IVFFlat for <1M vectors)
CREATE INDEX ON "KnowledgeChunk" USING hnsw (embedding vector_cosine_ops);

-- Compound index for filtering by source type + id
CREATE INDEX ON "KnowledgeChunk" ("sourceType", "sourceId");
