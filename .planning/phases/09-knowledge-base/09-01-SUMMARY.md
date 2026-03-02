---
phase: 09-knowledge-base
plan: "01"
subsystem: database
tags: [prisma, postgres, pgvector, rag, embeddings]

# Dependency graph
requires:
  - phase: 08-external-intake/02
    provides: "existing Next.js + tRPC + Prisma baseline for new Phase 09 modules"
provides:
  - "KnowledgeDocument, CodeRepository, KnowledgeChunk Prisma models"
  - "Manual pgvector migration SQL with HNSW + source indexes"
  - "RAG core utilities: chunkText, embedAndStore, retrieveRelevantChunks"
  - "Knowledge domain Zod schemas and AddCodeRepositoryInputSchema"
affects: [09-02, 09-03, 09-04, 09-05]

# Tech tracking
tech-stack:
  added: [pgvector, pdf-parse, "@octokit/rest", "@types/pdf-parse"]
  patterns:
    - Raw SQL vector writes and retrieval via prisma.$executeRaw/$queryRaw
    - Shared RAG source typing via KnowledgeSourceType
    - Paragraph-first chunking with overlap fallback for long sections

key-files:
  created:
    - prisma/migrations/20260302_add_knowledge_base/migration.sql
    - src/server/ai/rag/embed.ts
    - src/server/ai/rag/retrieve.ts
    - src/server/ai/rag/sources.ts
    - src/lib/schemas/knowledge.ts
  modified:
    - prisma/schema.prisma
    - package.json
    - package-lock.json

key-decisions:
  - "Enable Prisma postgresqlExtensions and datasource vector extension in schema upfront for pgvector compatibility"
  - "Keep KnowledgeChunk.embedding as Unsupported(\"vector(1536)\")? and route vector operations through raw SQL only"
  - "Filter sourceType in TypeScript after raw retrieval to avoid dynamic SQL injection patterns"
  - "Use text-embedding-3-small with embedMany maxParallelCalls=5 for batch ingestion"

patterns-established:
  - "RAG utilities live under src/server/ai/rag and are source-type aware"
  - "Distance threshold enforcement (0.35) happens in retrieveRelevantChunks"

requirements-completed: [KB-01, KB-02, KB-03]

# Metrics
duration: 46min
completed: 2026-03-02
---

# Phase 9 Plan 01: Knowledge Base Foundation Summary

**pgvector-ready knowledge base schema plus reusable embedding/retrieval primitives now exist, giving Phase 09 a shared RAG foundation for documents, repositories, and conversation history.**

## Performance

- **Duration:** 46 min
- **Started:** 2026-03-02T07:45:00Z
- **Completed:** 2026-03-02T08:31:32Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Added manual SQL migration for `KnowledgeDocument`, `CodeRepository`, and `KnowledgeChunk` with HNSW vector index and source index.
- Extended Prisma schema with pgvector extension support and three Phase 09 KB models.
- Implemented shared RAG helpers: text chunking, embedding persistence (`$executeRaw`), and semantic retrieval (`$queryRaw` + cosine distance).
- Added public-safe knowledge schemas for documents/repositories and repo-add input validation.

## Task Commits

Each task was committed atomically:

1. **Task 1: Manual pgvector migration SQL + Prisma schema update** - `ab99f1f` (feat)
2. **Task 2: RAG utilities and knowledge schemas** - `2cab333` (feat)

## Files Created/Modified

- `prisma/migrations/20260302_add_knowledge_base/migration.sql` - pgvector extension + KB tables/indexes
- `prisma/schema.prisma` - generator/datasource extension config + KB models
- `src/server/ai/rag/embed.ts` - chunking + embedding storage utility
- `src/server/ai/rag/retrieve.ts` - semantic retrieval utility with distance threshold
- `src/server/ai/rag/sources.ts` - shared source type union
- `src/lib/schemas/knowledge.ts` - Zod schemas for KB domain entities
- `package.json` / `package-lock.json` - new KB dependencies

## Decisions Made

- Chose raw SQL for all vector writes/queries and kept ORM usage to non-vector fields.
- Chose TypeScript-side filtering for optional `sourceTypes` to keep SQL static and safe.
- Kept chunking logic paragraph-first with overlap fallback to preserve semantic boundaries.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Local PostgreSQL missing pgvector extension binaries**
- **Found during:** Task 1 verification (`prisma migrate deploy`)
- **Issue:** Migration failed because `vector.control` does not exist in local PostgreSQL extension directory.
- **Fix:** Continued with schema/code foundation and captured required manual environment action (install pgvector for PostgreSQL 16) before re-running migration.
- **Files modified:** None (environment blocker)
- **Verification:** `npx.cmd prisma migrate status` reports `20260302_add_knowledge_base` failed due missing extension files.
- **Committed in:** N/A (environment precondition)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Core code foundation is complete; DB migration application is blocked until local pgvector is installed.

## Issues Encountered

- `npx.cmd prisma migrate deploy` failed with `extension "vector" is not available` on local PostgreSQL 16.

## User Setup Required

Install pgvector for PostgreSQL 16 on this machine, then run:

1. `npx.cmd prisma migrate resolve --rolled-back "20260302_add_knowledge_base"`
2. `npx.cmd prisma migrate deploy`

## Next Phase Readiness

- Wave 2 plans can proceed at code level (upload, repo, history integrations) because shared RAG utilities and schema contracts now exist.
- Runtime DB behavior remains blocked until pgvector is installed and migration is successfully applied.

## Self-Check: PASSED

---
*Phase: 09-knowledge-base*
*Completed: 2026-03-02*
