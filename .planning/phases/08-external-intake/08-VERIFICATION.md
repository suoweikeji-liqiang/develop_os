---
phase: 08-external-intake
verified: 2026-03-02T07:00:00Z
status: passed
score: 9/9 must-haves verified
re_verification: false
---

# Phase 8: External Intake Verification Report

**Phase Goal:** External departments can submit requirements without full system access and track their processing status
**Verified:** 2026-03-02T07:00:00Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #  | Truth                                                                                                        | Status     | Evidence                                                                                     |
|----|--------------------------------------------------------------------------------------------------------------|------------|----------------------------------------------------------------------------------------------|
| 1  | External submitter can POST a requirement via an unauthenticated tRPC endpoint                               | VERIFIED   | `baseProcedure` (= `t.procedure`, no session guard) used in `externalRouter.submit`          |
| 2  | Submission creates a Requirement row with `createdBy='external'` and a linked ExternalSubmission with UUID   | VERIFIED   | `prisma.$transaction` creates both rows; `createdBy: 'external'` hardcoded; `crypto.randomUUID()` for token |
| 3  | The token is returned to the caller for status lookups                                                       | VERIFIED   | `return { token, requirementId: result.requirement.id }` at end of submit mutation           |
| 4  | An unauthenticated query accepts a token and returns title, status, and updatedAt                            | VERIFIED   | `externalRouter.status` (baseProcedure query) returns `{ title, status, updatedAt, submitterName }` or null |
| 5  | External router reachable at `/api/trpc/external.submit` and `.status` without a session cookie              | VERIFIED   | `external: externalRouter` in appRouter; no middleware.ts blocking /api/trpc routes; baseProcedure has no auth check |
| 6  | Unauthenticated user can visit `/submit` without being redirected to login                                   | VERIFIED   | page.tsx has no `verifySession()` or `@/lib/dal` import; no middleware.ts exists; submit dir is outside `(dashboard)` route group |
| 7  | Form accepts title, description, submitter name, and optional contact email                                  | VERIFIED   | All four fields present in submit-form.tsx with correct validation and optionality             |
| 8  | After submission, user sees unique tracking token with copy button and link to status page                   | VERIFIED   | Success state renders amber warning box with full URL, Copy button (navigator.clipboard), and `<a>` link to statusUrl |
| 9  | Status page shows requirement title, Chinese status label, timestamp; invalid token shows "not found"        | VERIFIED   | STATUS_LABELS map (待处理/评审中/etc.), formattedDate render, XCircle "未找到该提交记录" fallback present |

**Score:** 9/9 truths verified

---

### Required Artifacts

| Artifact                                          | Expected                                              | Status     | Details                                                                                      |
|---------------------------------------------------|-------------------------------------------------------|------------|----------------------------------------------------------------------------------------------|
| `prisma/schema.prisma`                            | ExternalSubmission model + back-relation on Requirement | VERIFIED | Model at line 207 with token(unique), requirementId(unique), submitterName, submitterContact(optional); back-relation `externalSubmission ExternalSubmission?` at line 100 |
| `prisma/migrations/20260302045148_add_external_submission/migration.sql` | DDL for ExternalSubmission table | VERIFIED | CREATE TABLE with all columns; UNIQUE indexes on token and requirementId; FK with CASCADE |
| `src/lib/schemas/external.ts`                     | ExternalSubmitSchema Zod schema                       | VERIFIED   | Exports `ExternalSubmitSchema` and `ExternalSubmit` type; all four fields with correct constraints |
| `src/server/trpc/routers/external.ts`             | externalRouter with submit + status                   | VERIFIED   | 83 lines; both procedures use baseProcedure; $transaction; eventBus.emit; returns token; status returns null for unknown token |
| `src/server/trpc/router.ts`                       | external: externalRouter wired into appRouter         | VERIFIED   | Line 11: import; line 23: `external: externalRouter` in appRouter                            |
| `src/app/submit/page.tsx`                         | Server component wrapper, no auth guard               | VERIFIED   | 19 lines; `export const dynamic = 'force-dynamic'`; imports SubmitForm; no verifySession; no dal import |
| `src/app/submit/submit-form.tsx`                  | Client component with POST to external.submit          | VERIFIED   | 'use client'; fetch POST to /api/trpc/external.submit; discriminated union FormState; success state with copy button |
| `src/app/submit/status/[token]/page.tsx`          | Server component status page with force-dynamic        | VERIFIED   | `export const dynamic = 'force-dynamic'`; fetchStatus via HTTP; STATUS_LABELS; not-found fallback |

---

### Key Link Verification

| From                                              | To                              | Via                                   | Status   | Details                                                                         |
|---------------------------------------------------|---------------------------------|---------------------------------------|----------|---------------------------------------------------------------------------------|
| `src/server/trpc/router.ts`                       | `src/server/trpc/routers/external.ts` | `import + appRouter external key` | WIRED    | Line 11 import; line 23 `external: externalRouter`                              |
| `src/server/trpc/routers/external.ts`             | `prisma.externalSubmission`     | `$transaction` creating both rows     | WIRED    | `prisma.$transaction` at line 13; `tx.externalSubmission.create` at line 22     |
| `src/server/trpc/routers/external.ts`             | `baseProcedure`                 | import from `../init`                 | WIRED    | Line 2: `import { createTRPCRouter, baseProcedure } from '../init'`; confirmed `baseProcedure = t.procedure` (no auth) in init.ts |
| `src/app/submit/submit-form.tsx`                  | `/api/trpc/external.submit`     | fetch POST with JSON body             | WIRED    | Line 31: `fetch('/api/trpc/external.submit', { method: 'POST', body: JSON.stringify({ json: {...} }) })` + response parsed at line 52 |
| `src/app/submit/status/[token]/page.tsx`          | `/api/trpc/external.status`     | fetch GET with query param input      | WIRED    | Line 41: `fetch(\`${baseUrl}/api/trpc/external.status?input=${input}\`)`; result parsed at line 48 |

---

### Requirements Coverage

| Requirement | Source Plan | Description                                               | Status    | Evidence                                                                   |
|-------------|-------------|-----------------------------------------------------------|-----------|----------------------------------------------------------------------------|
| EXT-01      | 08-01, 08-02 | 外部部门可通过简单表单提交原始需求（无需完整登录）         | SATISFIED | Public /submit page has no auth guard; form POSTs to baseProcedure endpoint; submit dir outside (dashboard) group; no middleware.ts |
| EXT-02      | 08-01, 08-02 | 提交者可查看需求处理进度                                   | SATISFIED | UUID token returned on submit; /submit/status/[token] server component fetches via external.status; shows Chinese status labels + timestamps |

**Orphaned requirements check:** REQUIREMENTS.md maps only EXT-01 and EXT-02 to Phase 8. Both are claimed by both plans. No orphans.

---

### Success Criteria Coverage (from ROADMAP.md)

| Criterion | Status   | Evidence                                                                              |
|-----------|----------|---------------------------------------------------------------------------------------|
| External user can access a simple submission form without full login | VERIFIED | /submit is outside (dashboard) route group; no verifySession; no middleware blocking it |
| External user can submit a requirement with enough context for team processing | VERIFIED | Form captures title (required), description (min 10 chars, required), submitter name; stored as Requirement with full rawInput |
| External user can check the processing status of their submitted requirement | VERIFIED | Token returned post-submit; /submit/status/[token] renders live status with Chinese labels |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/server/trpc/routers/external.ts` | 53 | `console.log(...)` in catch block for email failure | Info | Intentional fire-and-forget pattern; logs status URL when email skipped — not a stub, this is the designed degradation path |

No blocker or warning anti-patterns found. The `return null` at line 73 of external.ts is correct behavior (token not found), not a stub.

---

### Human Verification Required

#### 1. Unauthenticated Access in Production Build

**Test:** Open incognito browser, navigate to `http://localhost:3000/submit`
**Expected:** Form renders without redirect to /login
**Why human:** Middleware behavior and session cookie checks cannot be fully verified statically — a running app is required to confirm no redirect occurs

#### 2. Form Submission End-to-End Flow

**Test:** Fill form at /submit, submit, copy the status URL from success state
**Expected:** Success amber box appears with full URL; URL is clickable and leads to status page showing "待处理"
**Why human:** Client-side state transitions (idle → submitting → success) and clipboard copy require a browser

#### 3. Invalid Token "Not Found" Page

**Test:** Visit `/submit/status/invalid-token-xyz`
**Expected:** XCircle icon + "未找到该提交记录" message + link back to /submit
**Why human:** Server component HTTP fetch to tRPC must return null — requires running server

---

### Gaps Summary

No gaps found. All 9 observable truths are verified across both plans. Both requirement IDs (EXT-01, EXT-02) are fully satisfied. All key links are wired end-to-end. The backend (Plan 01) and UI (Plan 02) form a complete, connected feature.

The three items flagged for human verification are confirmatory checks on correct behavior rather than gaps — the code structure strongly indicates they will pass.

---

_Verified: 2026-03-02T07:00:00Z_
_Verifier: Claude (gsd-verifier)_
