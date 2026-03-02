---
phase: 09-knowledge-base
plan: "05"
subsystem: api
tags: [rag, citations, ai-routes, prompting, prisma, ui]

# Dependency graph
requires:
  - phase: 09-02
    provides: "document upload and knowledge dashboard"
  - phase: 09-03
    provides: "repository source ingestion pipeline"
  - phase: 09-04
    provides: "history source embedding pipeline"
provides:
  - "RAG context injection into structuring and conversation prompt flows"
  - "Requirement citations persistence model and migration"
  - "Requirement detail Sources section with citation cards"
  - "Knowledge page explanation section for KB behavior"
affects: [10-conflict-detection]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Graceful degradation for retrieval errors (AI proceeds without RAG context)
    - Prompt builders accept optional RetrievedChunk[] for shared context formatting
    - Citation persistence as JSON array on Requirement row

key-files:
  created:
    - prisma/migrations/20260302_add_citations/migration.sql
  modified:
    - prisma/schema.prisma
    - src/server/ai/prompt.ts
    - src/server/ai/conversation-prompt.ts
    - src/server/ai/structuring.ts
    - src/app/api/ai/structure/route.ts
    - src/app/api/ai/converse/route.ts
    - src/app/(dashboard)/requirements/[id]/requirement-detail-client.tsx
    - src/app/(dashboard)/requirements/[id]/page.tsx
    - src/app/(dashboard)/knowledge/page.tsx

key-decisions:
  - "Structure route now requires requirementId so citations can be saved reliably on the target requirement"
  - "Keep retrieval failures non-fatal and continue generation/chat without context"
  - "Persist citations immediately from retrieved chunks in route-level fire-and-forget update"

patterns-established:
  - "Top-K retrieval split by use case: structuring=5 (all sources), conversation=3 (history)"
  - "Citation cards display sourceName, sourceType, and excerpt in requirement detail"

requirements-completed: [KB-01, KB-02, KB-03]

# Metrics
duration: 44min
completed: 2026-03-02
---

# Phase 9 Plan 05: RAG Injection and Citations Summary

**Knowledge-base chunks are now actively retrieved in both AI flows, citations are persisted on requirements, and source attribution is visible in the requirement detail UI.**

## Performance

- **Duration:** 44 min
- **Started:** 2026-03-02T09:54:36Z
- **Completed:** 2026-03-02T10:38:36Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments

- Extended structuring and conversation prompt builders to accept RAG context payloads.
- Added retrieval in both AI routes with graceful fallback when retrieval fails.
- Added `Requirement.citations` schema + migration and persisted citations from retrieved chunks.
- Added requirement detail "Sources" section to show citation cards.
- Added "How Knowledge Base Works" explanatory section to `/knowledge`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Prompt/context extensions + citations migration** - `f7af102` (feat)
2. **Task 2: Route retrieval wiring + citations UI + knowledge explanation** - `5a20cdb` (feat)

## Files Created/Modified

- `prisma/migrations/20260302_add_citations/migration.sql` - citations column migration
- `prisma/schema.prisma` - `Requirement.citations` field
- `src/server/ai/prompt.ts` - structuring prompt context injection
- `src/server/ai/conversation-prompt.ts` - conversation prompt history context injection
- `src/server/ai/structuring.ts` - ragContext threading into generation
- `src/app/api/ai/structure/route.ts` - retrieval, generation, citation persistence
- `src/app/api/ai/converse/route.ts` - history retrieval and prompt wiring
- `src/app/(dashboard)/requirements/[id]/requirement-detail-client.tsx` - source citation cards
- `src/app/(dashboard)/requirements/[id]/page.tsx` - citations prop wiring
- `src/app/(dashboard)/knowledge/page.tsx` - KB explanation section

## Decisions Made

- Enforced requirement-level target for structuring route so citations are always attributable.
- Kept retrieval non-blocking from a failure perspective to preserve AI availability.
- Stored lightweight citation snapshots (chunkId/sourceName/sourceType/excerpt) instead of full chunk content.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- `prisma migrate deploy` remains blocked by unresolved `20260302_add_knowledge_base` failure until pgvector is installed locally.

## User Setup Required

External services require manual configuration. See [09-USER-SETUP.md](./09-USER-SETUP.md).

## Next Phase Readiness

- Phase 9 code path is complete for KB ingestion + retrieval + citation surfacing.
- Before runtime validation, local DB must recover and apply migrations (pgvector install + migrate resolve/deploy).

## Self-Check: PASSED

---
*Phase: 09-knowledge-base*
*Completed: 2026-03-02*
