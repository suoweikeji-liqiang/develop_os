---
phase: 08-external-intake
plan: "01"
subsystem: external-intake-backend
tags: [prisma, trpc, zod, external-submission, unauthenticated]
dependency_graph:
  requires: [07-02-SUMMARY.md]
  provides: [ExternalSubmission DB table, external.submit endpoint, external.status endpoint]
  affects: [appRouter, prisma schema, Prisma client]
tech_stack:
  added: []
  patterns: [baseProcedure unauthenticated tRPC, $transaction atomic create, fire-and-forget email]
key_files:
  created:
    - prisma/migrations/20260302045148_add_external_submission/migration.sql
    - src/lib/schemas/external.ts
    - src/server/trpc/routers/external.ts
  modified:
    - prisma/schema.prisma
    - src/server/trpc/router.ts
decisions:
  - "[08-01]: baseProcedure (not protectedProcedure) used for both external endpoints — intentionally unauthenticated"
  - "[08-01]: $transaction creates Requirement + ExternalSubmission atomically — no orphan rows possible"
  - "[08-01]: token = crypto.randomUUID() (built-in Node 19+) — no uuid package needed"
  - "[08-01]: status returns null for unknown token — lets UI distinguish not-found from errors cleanly"
  - "[08-01]: Fire-and-forget confirmation email pattern reused from Phase 07-02 — consistent approach"
metrics:
  duration: 2min
  completed_date: "2026-03-02"
  tasks_completed: 2
  files_created: 3
  files_modified: 2
---

# Phase 8 Plan 01: External Submission Backend Summary

**One-liner:** Unauthenticated tRPC submit/status endpoints backed by ExternalSubmission Prisma model with UUID token tracking.

## What Was Built

Added the full backend layer for external intake:

1. **ExternalSubmission Prisma model** — new table with `token` (unique), `requirementId` (1:1 unique), `submitterName`, `submitterContact` (optional). Back-relation added to Requirement model. Migration `add-external-submission` applied and Prisma client regenerated.

2. **ExternalSubmitSchema Zod schema** — validates title (1-200 chars), description (10-5000 chars), submitterName (1-100 chars), submitterContact (optional, max 200). Error messages in Chinese for end-user facing validation.

3. **externalRouter** — two `baseProcedure` endpoints:
   - `external.submit` (mutation): creates Requirement with `createdBy='external'` + ExternalSubmission in `$transaction`, emits `requirement.created` event, sends fire-and-forget confirmation email if contact provided, returns `{ token, requirementId }`
   - `external.status` (query): accepts token, returns `{ title, status, updatedAt, submitterName }` or `null` if not found

4. **appRouter wiring** — `external: externalRouter` added to router.ts

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Prisma schema + migration | bf640e1 | prisma/schema.prisma, migration.sql |
| 2 | Zod schema + externalRouter + router wiring | e2c8ab5 | external.ts (schema), external.ts (router), router.ts |

## Verification Results

- `npx prisma validate` — PASS
- `npx tsc --noEmit` — PASS (zero errors)
- ExternalSubmission table created in devos database with token, requirementId, submitterName, submitterContact columns
- Endpoints registered at `/api/trpc/external.submit` and `/api/trpc/external.status`

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

Files exist:
- src/lib/schemas/external.ts - FOUND
- src/server/trpc/routers/external.ts - FOUND
- prisma/migrations/20260302045148_add_external_submission/migration.sql - FOUND

Commits exist:
- bf640e1 - FOUND (feat(08-01): add ExternalSubmission Prisma model and migration)
- e2c8ab5 - FOUND (feat(08-01): externalRouter with submit/status endpoints and Zod schema)
