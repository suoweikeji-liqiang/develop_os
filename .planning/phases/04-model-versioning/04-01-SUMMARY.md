---
phase: 04-model-versioning
plan: 01
subsystem: database, api
tags: [prisma, versioning, snapshots, trpc, immutable]

requires:
  - phase: 02-core-ai-structuring
    provides: FiveLayerModel schema and updateModel mutation
provides:
  - RequirementVersion Prisma model with immutable snapshot storage
  - Transactional snapshot-on-write in updateModel mutation
  - version.list tRPC endpoint (metadata-only version history)
  - version.getTwo tRPC endpoint (full model for two versions, supports diffing)
  - Backfill script for pre-existing requirements
affects: [04-02-version-diff-ui]

tech-stack:
  added: []
  patterns: [snapshot-on-write, transactional-versioning, compound-unique-key]

key-files:
  created:
    - src/server/trpc/routers/version.ts
    - scripts/backfill-versions.ts
  modified:
    - prisma/schema.prisma
    - src/server/trpc/routers/requirement.ts
    - src/server/trpc/router.ts
    - src/server/events/types.ts

key-decisions:
  - "Snapshot-on-write inside $transaction ensures atomicity of version creation + model update"
  - "version.list returns metadata only (no model JSON) for lightweight history display"
  - "version.getTwo supports fetching current requirement model directly when version matches latest"
  - "changeSource enum tracks origin of each model change (manual/ai-structure/ai-converse/assumption)"

patterns-established:
  - "Snapshot-on-write: read current state, create immutable snapshot, then update — all in $transaction"
  - "Compound unique key @@unique([requirementId, version]) for version lookup"

requirements-completed: [MOD-01]

duration: 5min
completed: 2026-02-28
---

# Phase 4 Plan 1: Version Snapshot Infrastructure Summary

**Immutable RequirementVersion snapshots with transactional snapshot-on-write and tRPC version history endpoints**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-28T17:09:20Z
- **Completed:** 2026-02-28T17:14:46Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- RequirementVersion Prisma model with compound unique key and cascade delete
- Transactional snapshot-on-write in updateModel — every model change preserves previous state
- version.list and version.getTwo tRPC endpoints for history browsing and diffing
- Backfill script ready for pre-existing requirements

## Task Commits

Each task was committed atomically:

1. **Task 1: Add RequirementVersion schema and migrate** - `c0fcc95` (feat)
2. **Task 2: Snapshot-on-write in updateModel and version tRPC router** - `93981cd` (feat)

## Files Created/Modified
- `prisma/schema.prisma` - Added RequirementVersion model with immutable snapshot fields
- `src/server/trpc/routers/version.ts` - Version history list and two-version fetch endpoints
- `src/server/trpc/routers/requirement.ts` - Transactional snapshot-on-write in updateModel
- `src/server/trpc/router.ts` - Registered versionRouter in appRouter
- `src/server/events/types.ts` - Added requirement.version.created event type
- `scripts/backfill-versions.ts` - One-time backfill for pre-existing requirements

## Decisions Made
- Snapshot-on-write inside $transaction ensures atomicity of version creation + model update
- version.list returns metadata only (no model JSON) for lightweight history display
- version.getTwo supports fetching current requirement model directly when version matches latest (since latest version lives on the Requirement row, not yet snapshotted)
- changeSource enum tracks origin of each model change for audit trail

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Prisma client regeneration required after schema change**
- **Found during:** Task 2 (TypeScript compilation)
- **Issue:** requirementVersion property not found on PrismaClient — generated client was stale
- **Fix:** Ran `npx prisma generate` to regenerate client with new RequirementVersion model
- **Verification:** `npx tsc --noEmit` passes cleanly
- **Committed in:** 93981cd (Task 2 commit)

**2. [Rule 1 - Bug] Prisma 7 DbNull for JSON null filter**
- **Found during:** Task 2 (TypeScript compilation)
- **Issue:** `{ not: null }` not valid for Json fields in Prisma 7 — requires `Prisma.DbNull`
- **Fix:** Changed backfill script to use `{ not: Prisma.DbNull }` filter
- **Verification:** `npx tsc --noEmit` passes cleanly
- **Committed in:** 93981cd (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both fixes necessary for compilation. No scope creep.

## Issues Encountered
- Backfill script initially failed with DATABASE_URL not set — resolved by sourcing .env before running tsx

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Version snapshot infrastructure complete, ready for Plan 02 (version diff UI)
- version.getTwo endpoint provides the data contract Plan 02 needs for side-by-side diffing

## Self-Check: PASSED

All 7 files verified present. Both task commits (c0fcc95, 93981cd) verified in git log.

---
*Phase: 04-model-versioning*
*Completed: 2026-02-28*
