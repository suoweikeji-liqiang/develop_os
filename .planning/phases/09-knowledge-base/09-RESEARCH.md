# Phase 9: Knowledge Base - Research

**Researched:** 2026-03-02
**Domain:** RAG (Retrieval-Augmented Generation), vector embeddings, document ingestion, code repository integration, conversational memory persistence
**Confidence:** MEDIUM-HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| KB-01 | User can upload background documents that the AI references during structuring | Document ingestion pipeline + pgvector embedding storage + RAG retrieval injected into structuring prompt |
| KB-02 | User can connect a code repository and the AI understands existing system structure | Octokit GitHub API to fetch repo tree + file content + embed code files as chunks |
| KB-03 | Historical clarification sessions and decisions are automatically retained and influence future AI suggestions | Existing `ConversationMessage` records already stored — need to embed them and retrieve relevant history per requirement |
</phase_requirements>

---

## Summary

Phase 9 adds a knowledge base layer that enriches the AI structuring and conversation pipeline with three sources of context: uploaded documents, connected code repositories, and accumulated historical decisions. The core technical mechanism for all three is the same: text chunking → vector embedding → pgvector storage → cosine-similarity retrieval at inference time.

The project already uses the Vercel AI SDK 6 (`ai@6.x`, `@ai-sdk/openai@3.x`) and PostgreSQL (via Prisma 7 + `@prisma/adapter-pg`). The natural stack extension is to enable the `pgvector` PostgreSQL extension in the existing database, add `Unsupported("vector(1536)")` fields to new schema models, and use `embedMany` from the AI SDK for batch processing. Retrieval is via raw SQL `$queryRaw` with the `<=>` cosine distance operator.

The most important integration point is the `buildStructuringPrompt()` function in `src/server/ai/prompt.ts` and `buildConversationPrompt()` in `src/server/ai/conversation-prompt.ts`. Both need to accept an optional `ragContext` parameter and inject retrieved chunks before the user's raw input. Citation tracking requires storing which chunk IDs contributed to a given model generation — this metadata should be stored on the `Requirement` model.

File upload cannot go through tRPC (which does not support multipart/form-data). Use a dedicated Next.js App Router API route (`app/api/upload/route.ts`) with `req.formData()` for document ingestion. For code repository access, use `@octokit/rest` with a user-provided GitHub personal access token stored encrypted in the database.

**Primary recommendation:** Enable pgvector in the existing PostgreSQL instance; use AI SDK `embedMany` + `openai.embeddingModel('text-embedding-3-small')` (1536 dimensions); store embeddings with `Unsupported("vector(1536)")` in Prisma; retrieve via `$queryRaw` with `<=>` operator; inject top-K chunks into existing prompt builders.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| pgvector (PostgreSQL extension) | 0.8.x | Vector storage + cosine similarity search | Already using PostgreSQL; avoids a separate vector DB; supports HNSW indexing |
| `pgvector` (npm) | ^0.2.x | TypeScript helpers: `toSql()` serialization + result parsing | Official Node.js client for pgvector; mandatory for `$queryRaw` inserts |
| `ai` (Vercel AI SDK) | ^6.0.105 (already installed) | `embedMany`, `embed`, `cosineSimilarity` | Already in project; native Zod 4 + OpenAI support |
| `@ai-sdk/openai` | ^3.0.37 (already installed) | `openai.embeddingModel('text-embedding-3-small')` | Already in project; cheapest OpenAI embedding model ($0.02/M tokens) |
| `pdf-parse` | ^2.x | PDF text extraction — pure TypeScript, Next.js/Vercel compatible | Most widely used; serverless-safe; no native binaries |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@octokit/rest` | ^21.x | GitHub REST API client for repository file fetching | KB-02 code repository integration |
| `mammoth` | ^1.9.x | `.docx` text extraction | If Word document uploads are needed |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| pgvector | Pinecone / Qdrant | Would require a separate service; pgvector is simpler since we already have PostgreSQL |
| `pdf-parse` | `unpdf` / `pdfjs-dist` | `unpdf` is newer TypeScript-first but less battle-tested in Next.js serverless; `pdf-parse` has known compatibility and wider adoption |
| `openai.embeddingModel('text-embedding-3-small')` | `text-embedding-3-large` | Large model is 6x more expensive and 3072 dimensions; small is sufficient for domain-specific document retrieval |
| `@octokit/rest` | Raw GitHub REST API via `fetch` | Octokit has full TypeScript types and handles auth, rate limiting, and pagination automatically |

**Installation:**

```bash
# Enable pgvector PostgreSQL extension (run once in DB migration)
# CREATE EXTENSION IF NOT EXISTS vector;

# Node packages
npm install pgvector pdf-parse @octokit/rest
npm install -D @types/pdf-parse
```

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── server/
│   ├── ai/
│   │   ├── prompt.ts               # EXTEND: add ragContext param
│   │   ├── conversation-prompt.ts  # EXTEND: add ragContext param
│   │   ├── structuring.ts          # EXTEND: retrieve + inject context
│   │   └── rag/
│   │       ├── embed.ts            # embedMany wrapper, chunking helpers
│   │       ├── retrieve.ts         # $queryRaw cosine similarity search
│   │       └── sources.ts          # source type: document | code | history
│   ├── trpc/
│   │   └── routers/
│   │       ├── knowledgeDocument.ts  # upload metadata, list, delete
│   │       └── codeRepository.ts     # add/remove GitHub repos, sync
│   └── db/
│       └── client.ts               # unchanged
├── app/
│   └── api/
│       └── upload/
│           └── route.ts            # POST multipart/form-data → process + embed
└── lib/
    └── schemas/
        └── knowledge.ts            # Zod schemas for KB entities
```

### Pattern 1: RAG Ingestion Pipeline

**What:** Ingest a source (document or code file) by extracting text, chunking it, batch-embedding, and persisting chunks with vector embeddings.

**When to use:** When a document is uploaded (KB-01) or a repository is synced (KB-02).

**Example:**

```typescript
// src/server/ai/rag/embed.ts
import { embedMany } from 'ai'
import { openai } from '@ai-sdk/openai'
import pgvector from 'pgvector'
import { prisma } from '@/server/db/client'

const CHUNK_SIZE = 400  // tokens (~1600 chars)
const CHUNK_OVERLAP = 50

export function chunkText(text: string): string[] {
  // Recursive character splitting: try paragraph boundaries first
  const paragraphs = text.split(/\n{2,}/)
  const chunks: string[] = []
  let current = ''

  for (const para of paragraphs) {
    if ((current + para).length > CHUNK_SIZE * 4) {
      if (current) chunks.push(current.trim())
      current = para
    } else {
      current = current ? `${current}\n\n${para}` : para
    }
  }
  if (current.trim()) chunks.push(current.trim())
  return chunks.filter(c => c.length > 50)
}

export async function embedAndStore(
  chunks: string[],
  sourceType: 'document' | 'code' | 'history',
  sourceId: string,
  metadata: Record<string, string> = {}
) {
  const { embeddings } = await embedMany({
    model: openai.embeddingModel('text-embedding-3-small'),
    values: chunks,
    maxParallelCalls: 5,
  })

  // Batch insert via raw SQL — pgvector Unsupported type requires $executeRaw
  for (let i = 0; i < chunks.length; i++) {
    const vec = pgvector.toSql(embeddings[i])
    await prisma.$executeRaw`
      INSERT INTO "KnowledgeChunk" (id, "sourceType", "sourceId", content, embedding, metadata, "createdAt")
      VALUES (gen_random_uuid(), ${sourceType}, ${sourceId}, ${chunks[i]}, ${vec}::vector, ${JSON.stringify(metadata)}::jsonb, NOW())
    `
  }
}
```

### Pattern 2: RAG Retrieval at Inference Time

**What:** At requirement structuring or conversation time, embed the user's query and retrieve top-K semantically similar chunks.

**When to use:** Before calling `generateStructuredModel()` or the conversation stream endpoint.

**Example:**

```typescript
// src/server/ai/rag/retrieve.ts
import { embed } from 'ai'
import { openai } from '@ai-sdk/openai'
import pgvector from 'pgvector'
import { prisma } from '@/server/db/client'

export interface RetrievedChunk {
  id: string
  sourceType: string
  sourceId: string
  content: string
  sourceName: string
  distance: number
}

export async function retrieveRelevantChunks(
  query: string,
  topK: number = 5,
  sourceTypes?: Array<'document' | 'code' | 'history'>
): Promise<RetrievedChunk[]> {
  const { embedding } = await embed({
    model: openai.embeddingModel('text-embedding-3-small'),
    value: query,
  })

  const vec = pgvector.toSql(embedding)
  const typeFilter = sourceTypes?.length
    ? `AND "sourceType" = ANY(ARRAY[${sourceTypes.map(t => `'${t}'`).join(',')}]::text[])`
    : ''

  const rows = await prisma.$queryRaw<RetrievedChunk[]>`
    SELECT id, "sourceType", "sourceId", content, "sourceName",
           embedding <=> ${vec}::vector AS distance
    FROM "KnowledgeChunk"
    WHERE 1=1 ${typeFilter}
    ORDER BY embedding <=> ${vec}::vector
    LIMIT ${topK}
  `
  return rows
}
```

### Pattern 3: Context Injection into Existing Prompts

**What:** Extend `buildStructuringPrompt()` and `buildConversationPrompt()` to accept RAG context and prepend it before the user input.

**When to use:** Always — retrieval is cheap (< 100ms) and the fallback is an empty array.

**Example:**

```typescript
// src/server/ai/prompt.ts (extended)
import type { RetrievedChunk } from './rag/retrieve'

export function buildStructuringPrompt(
  userInput: string,
  ragContext: RetrievedChunk[] = []
): string {
  const contextSection = ragContext.length > 0
    ? `## Relevant Context from Knowledge Base\n\n${ragContext
        .map((c, i) => `[${i + 1}] (${c.sourceName})\n${c.content}`)
        .join('\n\n---\n\n')}\n\n`
    : ''

  return SYSTEM_PROMPT + contextSection + userInput
}
```

### Pattern 4: File Upload via API Route (NOT tRPC)

**What:** tRPC does not support multipart/form-data. Use a Next.js App Router API route instead.

**When to use:** Whenever files must be ingested.

**Example:**

```typescript
// src/app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/server/auth/session'
import { extractTextFromFile } from '@/server/ai/rag/extract'
import { embedAndStore } from '@/server/ai/rag/embed'
import { prisma } from '@/server/db/client'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  const text = await extractTextFromFile(buffer, file.name)
  const doc = await prisma.knowledgeDocument.create({
    data: { name: file.name, mimeType: file.type, uploadedBy: session.userId },
  })

  // Fire-and-forget embedding (matches Phase 7 fire-and-forget pattern)
  void (async () => {
    const chunks = chunkText(text)
    await embedAndStore(chunks, 'document', doc.id, { sourceName: file.name })
    await prisma.knowledgeDocument.update({
      where: { id: doc.id },
      data: { status: 'READY', chunkCount: chunks.length },
    })
  })()

  return NextResponse.json({ id: doc.id, status: 'PROCESSING' })
}
```

### Pattern 5: GitHub Repository Sync via Octokit

**What:** Fetch the repository file tree using Octokit, filter code files, fetch content, chunk, and embed.

**When to use:** KB-02 — when a user connects a GitHub repository.

**Example:**

```typescript
// src/server/ai/rag/github.ts
import { Octokit } from '@octokit/rest'

export async function fetchAndEmbedRepository(
  owner: string,
  repo: string,
  githubToken: string
) {
  const octokit = new Octokit({ auth: githubToken })

  // 1. Get default branch
  const { data: repoData } = await octokit.repos.get({ owner, repo })
  const branch = repoData.default_branch

  // 2. Get full tree (recursive)
  const { data: treeData } = await octokit.git.getTree({
    owner, repo,
    tree_sha: branch,
    recursive: 'true',
  })

  // 3. Filter: only code files, skip binary/generated/large files
  const CODE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.java', '.md']
  const MAX_FILE_SIZE = 50_000 // bytes
  const codeFiles = treeData.tree.filter(f =>
    f.type === 'blob' &&
    CODE_EXTENSIONS.some(ext => f.path?.endsWith(ext)) &&
    (f.size ?? 0) < MAX_FILE_SIZE
  )

  // 4. Fetch content and embed (batched to avoid rate limits)
  for (const file of codeFiles) {
    const { data } = await octokit.repos.getContent({ owner, repo, path: file.path! })
    // data.content is base64 encoded
    const content = Buffer.from((data as any).content, 'base64').toString('utf-8')
    const chunks = chunkText(content)
    await embedAndStore(chunks, 'code', `${owner}/${repo}`, { sourceName: file.path! })
  }
}
```

### Anti-Patterns to Avoid

- **Storing raw file bytes in PostgreSQL:** Do not store file binary content in the DB. Extract text immediately, store only the text chunks. Files can be small enough to process in-memory.
- **Using tRPC for file upload:** tRPC uses JSON transport and cannot handle multipart. Always use a dedicated API route.
- **Embedding everything synchronously in the request:** Embedding is slow (100ms-1s per batch). Always fire-and-forget or background the embedding step.
- **Querying embeddings with Prisma ORM methods:** Prisma does not support `Unsupported()` fields in `findMany`. ALL vector queries MUST use `$queryRaw`.
- **Embedding full files without chunking:** Files larger than ~2000 tokens produce poor embeddings because the semantic signal is diluted. Chunk to 300-500 tokens.
- **Storing GitHub tokens in plaintext:** Encrypt the PAT before storing. Use AES-256 with a server-side `ENCRYPTION_KEY` env var.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Vector serialization to PostgreSQL | Custom number array formatter | `pgvector.toSql()` | pgvector's binary format has specific wire protocol requirements; toSql() handles this correctly |
| PDF text extraction | Custom PDF parser | `pdf-parse` | PDF format has hundreds of edge cases (compressed streams, XFA forms, encoding variants) |
| Cosine similarity calculation | Custom distance function | PostgreSQL `<=>` operator in `$queryRaw` | Runs in-database, benefits from HNSW index, much faster than computing in JS |
| Batch embedding with rate limiting | Custom retry/concurrency loop | `embedMany` with `maxParallelCalls` | AI SDK handles rate limiting, retries, and usage tracking |
| GitHub API authentication/pagination | Raw fetch with headers | `@octokit/rest` | Octokit handles auth strategies, rate limiting, pagination, and TypeScript types |

**Key insight:** Vector operations that happen in-database (indexing, similarity search) are orders of magnitude faster than fetching all rows and computing similarity in application code. Never retrieve all embeddings to JavaScript.

---

## Common Pitfalls

### Pitfall 1: Prisma 7 + Unsupported("vector") Migration Drift

**What goes wrong:** Running `prisma migrate dev` after adding `Unsupported("vector(1536)")` fields may report "drift detected" — the schema is out of sync with migration history. Confirmed as a known Prisma 7 bug (GitHub issue #28867).

**Why it happens:** Prisma 7 does stricter migration state checks. The `Unsupported` type may serialize differently in different comparison passes.

**How to avoid:** Write the migration SQL manually in `prisma/migrations/` rather than using `prisma migrate dev --create-only`. Create the migration file by hand:
```sql
-- prisma/migrations/TIMESTAMP_add_pgvector/migration.sql
CREATE EXTENSION IF NOT EXISTS vector;
ALTER TABLE "KnowledgeChunk" ADD COLUMN embedding vector(1536);
CREATE INDEX ON "KnowledgeChunk" USING hnsw (embedding vector_cosine_ops);
```
Then run `prisma migrate deploy` (not `dev`).

**Warning signs:** `Error: P3006` or "drift detected" during migration.

### Pitfall 2: pgvector Not Installed on PostgreSQL 16

**What goes wrong:** `CREATE EXTENSION vector` fails with "extension not available" — pgvector must be separately installed alongside PostgreSQL.

**Why it happens:** pgvector is not bundled with standard PostgreSQL. On Windows with PostgreSQL 16 installed via winget, it requires manual installation.

**How to avoid:** Install pgvector via the official installer for the matching PostgreSQL version. On Windows: download the `.zip` from `github.com/pgvector/pgvector/releases`, copy DLL and SQL files into the PostgreSQL `lib/` and `share/extension/` directories.

**Warning signs:** `ERROR: could not open extension control file "vector.control": No such file or directory`.

### Pitfall 3: tRPC File Upload Failure

**What goes wrong:** Passing `File` objects through a tRPC mutation causes "File objects are not supported" error.

**Why it happens:** tRPC uses JSON serialization by default; `File` is a binary type not serializable to JSON.

**How to avoid:** Always use `app/api/upload/route.ts` with `req.formData()` for file uploads. Use tRPC only for metadata operations (list documents, delete document, get status).

**Warning signs:** `TRPCClientError: File objects are not supported`.

### Pitfall 4: Embedding Column Not Excluded from Prisma Select

**What goes wrong:** Including the `embedding` field in a Prisma `select` or `include` causes a runtime error — `Unsupported` fields cannot be selected via the Prisma client API.

**Why it happens:** Prisma generates typed selects that exclude `Unsupported` fields. Any attempt to select them via the ORM throws.

**How to avoid:** The `embedding` column should NEVER appear in any Prisma `findMany`/`findUnique` call. All vector operations must go through `$queryRaw`. Store all non-vector fields (id, content, metadata, sourceType) as normal Prisma fields; only the `embedding` column is raw.

**Warning signs:** TypeScript compile-time error on the select field, or runtime `PrismaClientValidationError`.

### Pitfall 5: GitHub Token Scope and Rate Limiting

**What goes wrong:** Repository sync fails for private repos (insufficient token scope) or hits GitHub's 5000 req/hour API rate limit during large repo ingestion.

**Why it happens:** Default classic tokens may have limited scope. Large repositories with hundreds of files can exhaust the rate limit.

**How to avoid:** Require `repo` scope (or `public_repo` for public repos only). Implement exponential backoff on 403/429 responses. Process files in batches of 20-30 with a 1-second delay between batches.

**Warning signs:** HTTP 403 `Resource not accessible by integration`, or HTTP 429 `rate limit exceeded`.

### Pitfall 6: Context Injection Token Budget Overflow

**What goes wrong:** Injecting too many RAG chunks causes the prompt to exceed the model's context window (128K for GPT-4o), resulting in errors or degraded quality.

**Why it happens:** Large documents or broad queries may match many chunks. Top-K=10 with 400-token chunks = 4000 extra tokens, which is usually fine, but with multiple sources it can grow.

**How to avoid:** Cap total RAG context at 3000-4000 tokens (top-K=5 to 8 chunks). Apply a distance threshold: only include chunks where `distance < 0.3` (cosine similarity > 0.7). Prioritize: document chunks > code chunks > history chunks.

**Warning signs:** AI SDK error `context_length_exceeded`, or noticeably degraded output quality.

---

## Code Examples

### Enable pgvector Extension (Migration SQL)

```sql
-- prisma/migrations/TIMESTAMP_add_knowledge_base/migration.sql
CREATE EXTENSION IF NOT EXISTS vector;

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

CREATE TABLE "CodeRepository" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  owner TEXT NOT NULL,
  repo TEXT NOT NULL,
  "githubTokenEncrypted" TEXT NOT NULL,
  "lastSyncedAt" TIMESTAMPTZ,
  "addedBy" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "KnowledgeChunk" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "sourceType" TEXT NOT NULL,  -- 'document' | 'code' | 'history'
  "sourceId" TEXT NOT NULL,    -- FK to KnowledgeDocument.id or CodeRepository.id
  "sourceName" TEXT NOT NULL,  -- human-readable: filename or 'path/to/file.ts'
  content TEXT NOT NULL,
  embedding vector(1536) NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- HNSW index for fast cosine similarity search
CREATE INDEX ON "KnowledgeChunk" USING hnsw (embedding vector_cosine_ops);

-- Metadata index for filtering by source
CREATE INDEX ON "KnowledgeChunk" ("sourceType", "sourceId");
```

### Prisma Schema Addition

```prisma
// Add to prisma/schema.prisma

generator client {
  provider        = "prisma-client"
  output          = "../src/generated/prisma"
  previewFeatures = ["postgresqlExtensions"]
}

datasource db {
  provider   = "postgresql"
  extensions = [vector]
}

model KnowledgeDocument {
  id         String   @id @default(cuid())
  name       String
  mimeType   String
  status     String   @default("PROCESSING") // PROCESSING | READY | ERROR
  chunkCount Int?
  uploadedBy String
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}

model CodeRepository {
  id                   String    @id @default(cuid())
  owner                String
  repo                 String
  githubTokenEncrypted String
  lastSyncedAt         DateTime?
  addedBy              String
  createdAt            DateTime  @default(now())

  @@unique([owner, repo, addedBy])
}

model KnowledgeChunk {
  id         String                     @id @default(cuid())
  sourceType String                     // 'document' | 'code' | 'history'
  sourceId   String
  sourceName String
  content    String                     @db.Text
  embedding  Unsupported("vector(1536)")?
  metadata   Json                       @default("{}")
  createdAt  DateTime                   @default(now())

  @@index([sourceType, sourceId])
}
```

### AI SDK embedMany Usage

```typescript
// Source: https://ai-sdk.dev/docs/ai-sdk-core/embeddings
import { embedMany } from 'ai'
import { openai } from '@ai-sdk/openai'

const { embeddings, usage } = await embedMany({
  model: openai.embeddingModel('text-embedding-3-small'),
  values: chunks,          // string[]
  maxParallelCalls: 5,     // batch up to 5 API calls in parallel
})
// embeddings: number[][] — same order as input chunks
// usage.tokens: total tokens consumed (for cost tracking)
```

### Cosine Similarity Search

```typescript
// Source: pgvector-node official README + verified with pgvector docs
import pgvector from 'pgvector'
import { prisma } from '@/server/db/client'

const queryVec = pgvector.toSql(queryEmbedding)  // number[] → SQL-safe string

const results = await prisma.$queryRaw<Array<{
  id: string
  sourceName: string
  content: string
  distance: number
}>>`
  SELECT id, "sourceName", content,
         embedding <=> ${queryVec}::vector AS distance
  FROM "KnowledgeChunk"
  WHERE "sourceType" = ANY(ARRAY['document','code']::text[])
  ORDER BY embedding <=> ${queryVec}::vector
  LIMIT 5
`
// Filter by distance threshold
const relevant = results.filter(r => r.distance < 0.35)
```

### Citation Metadata Storage

```typescript
// Store which chunks were used to generate a model — for KB-03 citation display
// Add to Requirement model in schema: citations Json? @default("[]")

await prisma.requirement.update({
  where: { id: requirementId },
  data: {
    model: generatedModel,
    citations: retrievedChunks.map(c => ({
      chunkId: c.id,
      sourceName: c.sourceName,
      sourceType: c.sourceType,
      excerpt: c.content.slice(0, 200),
    })),
  },
})
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Separate vector database (Pinecone/Weaviate) | pgvector extension in existing PostgreSQL | 2023-2024 | Eliminates separate service; simpler deployment |
| LangChain for RAG orchestration | Direct Vercel AI SDK + raw SQL | 2024 | LangChain adds abstraction overhead; AI SDK is simpler for single-provider apps |
| IVFFlat vector index | HNSW index (preferred for small-medium datasets) | pgvector 0.5+ (2023) | HNSW has better recall and doesn't require pre-training with list count |
| All conversation history in prompt | Selective RAG retrieval of historical decisions | 2024-2025 | Context window management; only relevant history injected |
| `text-embedding-ada-002` | `text-embedding-3-small` | Jan 2024 | Better performance, cheaper ($0.02/M vs $0.10/M tokens) |

**Deprecated/outdated:**
- LangChain for simple single-provider RAG: excessive abstraction overhead for this use case
- IVFFlat index: HNSW is now preferred for datasets < 1M vectors (no `nlist` tuning required)
- Separate vector store services for small-team internal tools: pgvector makes this unnecessary

---

## Open Questions

1. **pgvector installation on the development Windows machine**
   - What we know: PostgreSQL 16 is installed via winget (from Phase 1 decisions); pgvector must be separately installed
   - What's unclear: Whether the developer has already installed pgvector, or whether it needs to be added to setup instructions
   - Recommendation: Wave 0 of the plan should include a pgvector installation step and verify `CREATE EXTENSION vector` succeeds

2. **GitHub Token Storage Encryption**
   - What we know: GitHub PATs must be stored — storing plaintext is a security violation
   - What's unclear: Whether a simple AES-256 encrypt/decrypt util exists in the project, or needs to be built
   - Recommendation: Use Node.js built-in `crypto` module with `createCipheriv`/`createDecipheriv` — no external package needed. Require `ENCRYPTION_KEY` env var (32 bytes hex). Document as prerequisite.

3. **History Embedding Scope for KB-03**
   - What we know: `ConversationMessage` rows are already stored in DB; `RequirementVersion` snapshots contain model evolution history
   - What's unclear: Whether to embed ALL historical conversations or only "decision" messages flagged by the AI, and whether embeddings span across requirements (global KB) or per-requirement
   - Recommendation: Start with global embedding of all conversation messages (sourceType='history', sourceId=conversationMessage.requirementId). This lets the AI surface similar past decisions across requirements — the most valuable signal.

4. **File Storage Strategy**
   - What we know: For Next.js serverless deployment, writing to local disk is ephemeral (cleared between deployments)
   - What's unclear: Whether file binary content needs to be retained after text extraction, or if discarding is acceptable
   - Recommendation: Extract text immediately in the upload handler, discard binary content. Store only extracted text and metadata in the database. This avoids S3/blob storage complexity for v1.

---

## Sources

### Primary (HIGH confidence)
- [ai-sdk.dev/docs/ai-sdk-core/embeddings](https://ai-sdk.dev/docs/ai-sdk-core/embeddings) — `embed`, `embedMany` API, provider list, `maxParallelCalls`
- [github.com/pgvector/pgvector-node](https://github.com/pgvector/pgvector-node) — `toSql()`, `$queryRaw` patterns for Node.js
- [prisma.io docs — postgres extensions](https://www.prisma.io/docs/postgres/database/postgres-extensions) — `Unsupported("vector")`, previewFeatures
- [octokit.github.io/rest.js/v22](https://octokit.github.io/rest.js/v22/) — Octokit v22 REST API

### Secondary (MEDIUM confidence)
- [blogs.perficient.com — Postgres RAG Stack 2025](https://blogs.perficient.com/2025/07/17/postgres-typescript-rag-stack/) — Full pgvector + TypeScript + embedMany pipeline example
- [github.com/prisma/prisma/issues/28867](https://github.com/prisma/prisma/issues/28867) — Confirmed Prisma 7 + Unsupported("vector") migration drift bug
- [github.com/trpc/trpc/discussions/658](https://github.com/trpc/trpc/discussions/658) — Confirmed tRPC multipart/form-data limitation
- [npmjs.com/package/pdf-parse](https://www.npmjs.com/package/pdf-parse) — pdf-parse TypeScript compatibility and Next.js usage

### Tertiary (LOW confidence — needs validation)
- pgvector Windows installation procedure for PostgreSQL 16 via winget — based on general pgvector docs, not verified for this specific setup
- Chunk size recommendation of 300-500 tokens for this domain — based on general RAG best practices; optimal value should be empirically tested

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — AI SDK, pgvector, Octokit are all well-documented; versions verified
- Architecture: HIGH — patterns are derived from official docs and verified examples
- Pitfalls: MEDIUM — Prisma 7 migration drift is confirmed via GitHub issue; Windows pgvector install is LOW confidence

**Research date:** 2026-03-02
**Valid until:** 2026-04-02 (stable libraries, but AI SDK and Prisma release frequently — check changelogs before planning)
