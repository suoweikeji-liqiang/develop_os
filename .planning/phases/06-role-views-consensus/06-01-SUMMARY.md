---
phase: 06-role-views-consensus
plan: "01"
subsystem: consensus-signoff
tags: [prisma, trpc, signoff, consensus, workflow]
dependency_graph:
  requires: []
  provides: [ReviewSignoff-model, signoffRouter, consensus-gate, signoff-invalidation]
  affects: [requirement-router, event-bus, app-router]
tech_stack:
  added: []
  patterns: [upsert-idempotency, consensus-gate, sign-off-invalidation, event-emission]
key_files:
  created:
    - prisma/migrations/20260301133650_add_review_signoff/migration.sql
    - src/server/trpc/routers/signoff.ts
  modified:
    - prisma/schema.prisma
    - src/server/events/types.ts
    - src/server/trpc/router.ts
    - src/server/trpc/routers/requirement.ts
decisions:
  - "ReviewSignoff uses @@unique([requirementId, role]) compound key enabling idempotent upserts per role"
  - "REQUIRED_ROLES constant ['PRODUCT','DEV','TEST','UI'] excludes EXTERNAL which is not a reviewer"
  - "Sign-off invalidation captures status before $transaction to avoid extra read inside transaction"
  - "CONSENSUS->IN_REVIEW backward transition clears sign-offs (re-review required)"
metrics:
  duration: "10min"
  completed_date: "2026-03-01"
  tasks_completed: 3
  files_changed: 6
---

# Phase 6 Plan 01: ReviewSignoff Model and Consensus API Summary

**One-liner:** ReviewSignoff Prisma model with idempotent role-based sign-offs and four-role consensus gate blocking IN_REVIEW->CONSENSUS transition.

## What Was Built

Added the complete data model and API layer for the consensus sign-off workflow:

1. **ReviewSignoff Prisma model** — compound unique key `[requirementId, role]` enables idempotent upserts; `onDelete: Cascade` from Requirement; checklist stored as JSON; migration applied to devos database.

2. **signoffRouter tRPC API** — `submit` mutation validates: (a) caller holds the role, (b) requirement is IN_REVIEW, (c) all checklist items checked. Upserts the sign-off and emits `requirement.signoff.submitted`. `list` query returns sign-offs with user name for display.

3. **Consensus gate** — `transitionStatus` blocks IN_REVIEW->CONSENSUS if any of PRODUCT/DEV/TEST/UI has not signed off, returning PRECONDITION_FAILED with the list of missing roles.

4. **Sign-off invalidation** — `updateModel` detects IN_REVIEW status before the transaction and deletes all sign-offs after the model update, emitting `requirement.signoff.invalidated`. `transitionStatus` also clears sign-offs on CONSENSUS->IN_REVIEW backward transition.

5. **Event types** — Added `requirement.signoff.submitted` and `requirement.signoff.invalidated` to EventMap.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | aacc4bd | ReviewSignoff Prisma model, migration, and sign-off event types |
| Task 2 | 4b989ed | signoffRouter with submit mutation and list query |
| Task 3 | d3f2206 | Consensus gate and sign-off invalidation in requirement router |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Prisma client not regenerated after migration**
- **Found during:** Task 2 verification
- **Issue:** TypeScript errors `Property 'reviewSignoff' does not exist on type 'PrismaClient'` — the generated client was not updated after the migration applied the new table
- **Fix:** Ran `npx prisma generate` to regenerate the client with ReviewSignoff model included
- **Files modified:** src/generated/prisma (gitignored, not committed)
- **Commit:** Included in Task 2 commit 4b989ed

## Success Criteria Verification

- [x] ReviewSignoff Prisma model with @@unique([requirementId, role]) is in schema and migrated
- [x] signoffRouter has submit (mutation) and list (query) procedures
- [x] appRouter registers signoff router as `signoff: signoffRouter`
- [x] transitionStatus blocks IN_REVIEW->CONSENSUS if any of PRODUCT/DEV/TEST/UI have not signed
- [x] updateModel deletes all sign-offs when requirement is IN_REVIEW
- [x] CONSENSUS->IN_REVIEW backward transition also clears sign-offs
- [x] Event types include signoff.submitted and signoff.invalidated
- [x] `npx prisma validate` passes
- [x] `npx tsc --noEmit` passes with exit 0

## Self-Check: PASSED

- FOUND: prisma/schema.prisma (contains ReviewSignoff model)
- FOUND: src/server/trpc/routers/signoff.ts (new file)
- FOUND: src/server/events/types.ts (signoff events added)
- FOUND: src/server/trpc/router.ts (signoff router registered)
- FOUND: src/server/trpc/routers/requirement.ts (consensus gate + invalidation)
- FOUND: prisma/migrations/20260301133650_add_review_signoff/migration.sql
- Commits verified: aacc4bd, 4b989ed, d3f2206
