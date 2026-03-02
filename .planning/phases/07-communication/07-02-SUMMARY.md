---
phase: 07-communication
plan: "02"
subsystem: notifications
tags: [sse, resend, react-email, webhooks, eventemitter3, notifications]

requires:
  - phase: 07-communication/01
    provides: "Comment, Mention, Notification, WebhookConfig Prisma models; comment.created and notification.created event types"
provides:
  - "notificationRouter (list, unreadCount, markRead, markAllRead)"
  - "webhookRouter (upsert, get)"
  - "SSE endpoint at /api/notifications/stream for real-time push"
  - "NotificationBell component in dashboard header"
  - "Email delivery via Resend (mention + status change) with console fallback"
  - "Webhook delivery utility with 5s timeout"
affects: [08-external-intake]

tech-stack:
  added: [resend, "@react-email/components"]
  patterns: [fire-and-forget-email, sse-per-user-filtering, dynamic-import-for-side-effects]

key-files:
  created:
    - src/server/trpc/routers/notification.ts
    - src/server/trpc/routers/webhook.ts
    - src/app/api/notifications/stream/route.ts
    - src/lib/hooks/use-notification-stream.ts
    - src/lib/email/send-mention-email.ts
    - src/lib/email/send-status-change-email.ts
    - src/lib/email/templates/mention-email.tsx
    - src/lib/email/templates/status-change-email.tsx
    - src/lib/webhooks/deliver.ts
    - src/components/notifications/notification-bell.tsx
  modified:
    - src/server/trpc/router.ts
    - src/server/trpc/routers/comment.ts
    - src/server/trpc/routers/requirement.ts
    - src/app/(dashboard)/layout.tsx

key-decisions:
  - "Fire-and-forget pattern for email and webhook — never blocks mutation response"
  - "Dynamic import in requirement.ts status notification to avoid circular dependencies"
  - "Console.log fallback when RESEND_API_KEY absent — zero-config dev experience"
  - "SSE filters by userId server-side — each user only receives their own notifications"

patterns-established:
  - "Fire-and-forget side-effects: void (async () => { ... })()"
  - "SSE with eventBus.on/off and abort signal cleanup"
  - "React Email templates as plain function components"

requirements-completed: [COL-04]

duration: 7min
completed: 2026-03-02
---

# Phase 7 Plan 02: Notifications, SSE, and Webhooks Summary

**Real-time notification bell via SSE, email delivery via Resend with console fallback, webhook delivery with 5s timeout, all wired through eventBus**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-02T02:51:44Z
- **Completed:** 2026-03-02T02:58:36Z
- **Tasks:** 3
- **Files modified:** 14

## Accomplishments
- notification + webhookConfig tRPC routers with full CRUD
- SSE endpoint filtering notification.created events per-user with abort cleanup
- NotificationBell in dashboard header with live unread badge, dropdown, mark read
- Email templates (mention + status change) via React Email + Resend with console fallback
- Webhook delivery fire-and-forget with 5s timeout
- comment.create and transitionStatus wired to email + webhook delivery

## Task Commits

1. **Task 1: notification + webhookConfig tRPC routers + SSE + hooks** - `984ff5a` (feat)
2. **Task 2: Email templates + webhook delivery + event bus wiring** - `9e6b626` (feat)
3. **Task 3: NotificationBell component + dashboard layout** - `ac4573f` (feat)

## Files Created/Modified
- `src/server/trpc/routers/notification.ts` - list, unreadCount, markRead, markAllRead
- `src/server/trpc/routers/webhook.ts` - upsert, get
- `src/app/api/notifications/stream/route.ts` - SSE endpoint with force-dynamic
- `src/lib/hooks/use-notification-stream.ts` - EventSource hook
- `src/lib/email/send-mention-email.ts` - Resend email with console fallback
- `src/lib/email/send-status-change-email.ts` - Resend email with console fallback
- `src/lib/email/templates/mention-email.tsx` - React Email mention template
- `src/lib/email/templates/status-change-email.tsx` - React Email status change template
- `src/lib/webhooks/deliver.ts` - POST with 5s AbortSignal.timeout
- `src/components/notifications/notification-bell.tsx` - Bell icon + dropdown + SSE
- `src/server/trpc/router.ts` - Added notification + webhookConfig routers
- `src/server/trpc/routers/comment.ts` - Wired email + webhook on mention
- `src/server/trpc/routers/requirement.ts` - Wired notification + email + webhook on status change
- `src/app/(dashboard)/layout.tsx` - Mounted NotificationBell in header

## Decisions Made
- Fire-and-forget for email/webhook — never awaited in mutation response path
- Dynamic import in requirement.ts to avoid circular dependency with email modules
- Console.log fallback when RESEND_API_KEY absent for zero-config dev experience
- SSE filters by userId server-side so each connection only receives relevant events

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required

External services require manual configuration:
- `RESEND_API_KEY` — from Resend Dashboard -> API Keys (optional, console fallback works without it)
- `EMAIL_FROM` — verified sender address (defaults to onboarding@resend.dev for testing)
- `NEXT_PUBLIC_APP_URL` — base URL for email links (defaults to http://localhost:3000)

## Next Phase Readiness
- Phase 7 Communication complete — COL-03 (comments/@mentions) and COL-04 (notifications) both satisfied
- Ready for Phase 8: External Intake

## Self-Check: PASSED

- All 3 commits verified: 984ff5a, 9e6b626, ac4573f
- All 10 created files found on disk
- Zero TypeScript errors

---
*Phase: 07-communication*
*Completed: 2026-03-02*
