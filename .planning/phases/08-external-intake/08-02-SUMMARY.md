---
phase: 08-external-intake
plan: "02"
subsystem: ui
tags: [nextjs, react, tailwind, trpc, public-pages, chinese-ui]

# Dependency graph
requires:
  - phase: 08-01
    provides: external.submit and external.status tRPC endpoints (baseProcedure, unauthenticated)
provides:
  - Public /submit page — unauthenticated form for external requirement submission
  - Public /submit/status/[token] page — status tracking with Chinese labels
  - SubmitForm client component — fetch-based tRPC POST, discriminated union FormState, copy button
  - StatusPage server component — server-side HTTP fetch with cache:no-store, not-found handling
affects: [09-analytics, 10-conflict-detection]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Public Next.js pages outside (dashboard) route group with no verifySession/dal imports
    - Discriminated union FormState for clear client-side state transitions (idle/submitting/success/error)
    - Server component HTTP fetch to tRPC (cache:no-store) for dynamic public pages
    - params typed as Promise<{ token }> for Next.js 15 App Router dynamic segments

key-files:
  created:
    - src/app/submit/page.tsx
    - src/app/submit/submit-form.tsx
    - src/app/submit/status/[token]/page.tsx
  modified: []

key-decisions:
  - "params typed as Promise<{ token: string }> — required in Next.js 15 App Router (same pattern as dashboard pages)"
  - "StatusPage fetches via HTTP to tRPC with cache:no-store and force-dynamic — prevents stale status display"
  - "fetchStatus returns null for any error — single not-found UI handles both invalid token and network failure"
  - "SubmitForm shows full status URL (not just token) in amber warning box — UX clarity for save-this-link"
  - "submitterContact uses type=email for browser validation but is optional — consistent with backend schema"

patterns-established:
  - "Public page pattern: no verifySession, no @/lib/dal imports, export const dynamic = 'force-dynamic'"
  - "Client form fetch pattern: POST JSON body { json: {...} } matching tRPC HTTP format"
  - "Status icon mapping: Record<string, React.ReactNode> keyed by Prisma enum value"

requirements-completed: [EXT-01, EXT-02]

# Metrics
duration: 2min
completed: 2026-03-02
---

# Phase 8 Plan 02: External Intake — Public Pages Summary

**Two public Next.js pages wired to Plan 01 tRPC endpoints: /submit form with copy-able tracking URL and /submit/status/[token] with Chinese status labels, both fully accessible without authentication.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-02T04:58:11Z
- **Completed:** 2026-03-02T05:00:11Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Public /submit page renders without auth redirect — ExternalSubmitPage has no verifySession or dal imports
- SubmitForm client component with discriminated union FormState, POSTs to external.submit, shows amber warning box with full URL + copy button on success
- Status tracking page at /submit/status/[token] shows requirement title, Chinese status label with icon, submitter name, and last-updated timestamp
- Not-found state for invalid tokens with link back to /submit

## Task Commits

Each task was committed atomically:

1. **Task 1: Public submission form at /submit** - `29f01e1` (feat)
2. **Task 2: Status tracking page at /submit/status/[token]** - `29c32b0` (feat)

## Files Created/Modified

- `src/app/submit/page.tsx` - Server component wrapper, no auth guard, exports SubmitForm
- `src/app/submit/submit-form.tsx` - Client component with FormState union, fetch POST to external.submit, success/error/loading states
- `src/app/submit/status/[token]/page.tsx` - Server component, HTTP fetch with cache:no-store, Chinese status labels/icons/descriptions, not-found fallback

## Decisions Made

- `params` typed as `Promise<{ token: string }>` for Next.js 15 App Router compatibility — same pattern used in dashboard dynamic pages
- `fetchStatus` returns `null` for any error (network failure or unknown token), collapsing both cases into one "not found" UI — simpler and equally correct
- Success state shows the full status URL (e.g., `http://localhost:3000/submit/status/uuid`) rather than just the token — users can directly save or share the link
- Amber warning box for "save this link" emphasizes urgency without blocking the success experience

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - TypeScript compiled clean on first attempt for both tasks.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- EXT-01 and EXT-02 fully satisfied: public form accessible without login, submitter can track status with token
- Phase 8 complete — both plans done, ExternalSubmission backend + public UI pages shipped
- Ready for Phase 9 (Analytics) or Phase 10 (Conflict Detection) based on roadmap priority

## Self-Check: PASSED

- src/app/submit/page.tsx: FOUND
- src/app/submit/submit-form.tsx: FOUND
- src/app/submit/status/[token]/page.tsx: FOUND
- .planning/phases/08-external-intake/08-02-SUMMARY.md: FOUND
- Commit 29f01e1: FOUND
- Commit 29c32b0: FOUND

---
*Phase: 08-external-intake*
*Completed: 2026-03-02*
