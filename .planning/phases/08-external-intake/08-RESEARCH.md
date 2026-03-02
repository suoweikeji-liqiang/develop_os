# Phase 8: External Intake - Research

**Researched:** 2026-03-02
**Domain:** Public form submission without authentication, anonymous token-based status tracking
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| EXT-01 | 外部部门可通过简单表单提交原始需求（无需完整登录） | Anonymous submission endpoint (Server Action or API route), no session guard on submit page. Token issued on submit for later tracking. |
| EXT-02 | 提交者可查看需求处理进度 | Token-based status page, polling or static fetch, exposes RequirementStatus to unauthenticated holder of the token. |
</phase_requirements>

---

## Summary

Phase 8 adds a lightweight external intake pathway for departments that do not have full DevOS accounts. The two requirements are tightly coupled: EXT-01 is the write path (submit a requirement via a public form) and EXT-02 is the read path (check processing status using a secret token received at submission time).

The key design constraint is "no full login" — the submitter must not need an account. The existing session-cookie / JWT auth system must not be used for this flow. The recommended approach is to issue a short, unguessable token (UUID or CUID) at submission time, store it alongside the newly-created requirement, and use it as a "claim check" for the status page. This pattern is standard for anonymous-submission / claim-check systems (e.g., GitHub Gist secret links, Typeform response links).

The existing codebase already has a `baseProcedure` (unauthenticated tRPC procedure) in `init.ts`, a `Role.EXTERNAL` enum value in Prisma, and a public `/api/trpc` handler — all needed building blocks are present. The main additions are: a new `ExternalSubmission` Prisma model, a new `external` tRPC sub-router with two `baseProcedure` endpoints, two new Next.js page routes outside the `(dashboard)` route group, and a Prisma migration.

**Primary recommendation:** Use a token-column on a new `ExternalSubmission` model linked to the `Requirement`. Issue CUID token at submit time, store it, return it to the user (display once + copy button). Status page at `/submit/status/[token]` fetches the linked requirement's status via `baseProcedure`.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js (App Router) | 16.1.6 (already installed) | Public pages at `/submit/*` outside `(dashboard)` route group | Existing framework |
| Prisma 7 | 7.4.2 (already installed) | New `ExternalSubmission` model + migration | Existing ORM |
| tRPC 11 | 11.0.0 (already installed) | `baseProcedure` for unauthenticated endpoints | Existing API layer |
| Zod 4 | 4.3.6 (already installed) | Input validation for external submit payload | Existing validation |
| `@cuid2` / `crypto.randomUUID` | Node built-in | Generating unguessable claim tokens | Built-in, zero dependency |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `clsx` / `tailwind-merge` | already installed | Styling the public form | Same as rest of app |
| `lucide-react` | already installed | Icons on status page (clock, check, spinner) | Consistency |
| `server-only` | already installed | Guard internal helpers from being imported client-side | Same pattern as existing auth |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `crypto.randomUUID()` for token | `@cuid2` (cuid()) | Both produce unguessable IDs. `crypto.randomUUID()` is built into Node 19+ and the browser — zero install. Use it. |
| baseProcedure on tRPC | Plain Next.js Server Action | Either works. tRPC is already the project pattern; keeping consistent avoids a second API style. |
| baseProcedure on tRPC | Plain Next.js Route Handler | Same tradeoff as above. tRPC keeps all API logic in one place. |
| Token-based status | Full account creation for submitter | Account creation defeats EXT-01 "no full login". Token approach is simpler and sufficient. |

**Installation:** No new packages needed. All required libraries are already in `package.json`.

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── app/
│   ├── (dashboard)/          # Existing — guarded by verifySession()
│   ├── (auth)/               # Existing — login / register
│   └── submit/               # NEW — public, no auth guard
│       ├── page.tsx           # EXT-01: submission form
│       └── status/
│           └── [token]/
│               └── page.tsx   # EXT-02: status page
├── server/
│   └── trpc/
│       └── routers/
│           └── external.ts    # NEW — baseProcedure submit + status endpoints
└── lib/
    └── schemas/
        └── external.ts        # NEW — ExternalSubmitSchema Zod schema
```

### Pattern 1: Public Route Outside Dashboard Route Group

**What:** Place `/submit/*` pages directly under `src/app/submit/` — NOT inside the `(dashboard)` route group. The `(dashboard)/layout.tsx` calls `verifySession()` which redirects to login; any page inside that group is auth-gated.

**When to use:** Any page that must be reachable by unauthenticated users.

**Example:**
```typescript
// src/app/submit/page.tsx — NO verifySession() call
export const dynamic = 'force-dynamic'

export default function ExternalSubmitPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SubmitForm />
    </div>
  )
}
```

### Pattern 2: baseProcedure Endpoint (Already in init.ts)

**What:** `baseProcedure` in `src/server/trpc/init.ts` is an unauthenticated tRPC procedure. Use it for external-facing endpoints.

**When to use:** Any API call that must succeed without a valid session cookie.

**Example:**
```typescript
// src/server/trpc/routers/external.ts
import { z } from 'zod'
import { createTRPCRouter, baseProcedure } from '../init'
import { prisma } from '@/server/db/client'
import { eventBus } from '@/server/events/bus'

export const externalRouter = createTRPCRouter({
  submit: baseProcedure
    .input(ExternalSubmitSchema)
    .mutation(async ({ input }) => {
      const token = crypto.randomUUID()
      const result = await prisma.$transaction(async (tx) => {
        const requirement = await tx.requirement.create({
          data: {
            title: input.title,
            rawInput: input.description,
            createdBy: 'external',  // sentinel value — no userId
          },
        })
        const submission = await tx.externalSubmission.create({
          data: {
            token,
            requirementId: requirement.id,
            submitterName: input.submitterName,
            submitterContact: input.submitterContact ?? null,
          },
        })
        return { requirement, submission }
      })

      eventBus.emit('requirement.created', {
        requirementId: result.requirement.id,
        createdBy: 'external',
      })

      return { token, requirementId: result.requirement.id }
    }),

  status: baseProcedure
    .input(z.object({ token: z.string().min(1) }))
    .query(async ({ input }) => {
      const submission = await prisma.externalSubmission.findUnique({
        where: { token: input.token },
        include: {
          requirement: {
            select: { id: true, title: true, status: true, updatedAt: true },
          },
        },
      })
      if (!submission) return null
      return {
        title: submission.requirement.title,
        status: submission.requirement.status,
        updatedAt: submission.requirement.updatedAt.toISOString(),
      }
    }),
})
```

### Pattern 3: ExternalSubmission Prisma Model

**What:** A join table between an anonymous submission and the Requirement it creates. Holds the claim token and optional submitter metadata.

**When to use:** Any time you need an unauthenticated "claim check" linked to an internal resource.

**Prisma schema addition:**
```prisma
model ExternalSubmission {
  id              String      @id @default(cuid())
  token           String      @unique
  requirementId   String
  submitterName   String
  submitterContact String?    // email or other contact — optional
  createdAt       DateTime    @default(now())

  requirement     Requirement @relation(fields: [requirementId], references: [id], onDelete: Cascade)

  @@index([token])
}
```

`Requirement` model gets a back-relation field:
```prisma
// Add to existing Requirement model:
externalSubmission ExternalSubmission?
```

### Pattern 4: Token Display + Copy on Submission Success

**What:** After successful submit, show the token prominently with a copy button. The token is displayed ONCE (like a secret). The user is instructed to bookmark the status URL.

**When to use:** Any claim-token UX flow.

**Example client pattern:**
```typescript
// After successful fetch('/api/trpc/external.submit', ...)
const { token } = result.json.result.data
router.push(`/submit/status/${token}?new=1`)
// Status page reads ?new=1 to show "save this link" banner
```

### Pattern 5: Status Page — Server Component Fetch

**What:** The status page at `/submit/status/[token]` is a server component that calls the tRPC `external.status` query directly via server-side fetch (same pattern as other dashboard server components — direct Prisma or fetch to `/api/trpc`).

**When to use:** Status data that doesn't need real-time push — simple refresh is sufficient.

```typescript
// src/app/submit/status/[token]/page.tsx
export const dynamic = 'force-dynamic'

export default async function StatusPage({ params }: { params: { token: string } }) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL}/api/trpc/external.status?input=${encodeURIComponent(JSON.stringify({ json: { token: params.token } }))}`,
    { cache: 'no-store' }
  )
  const data = await res.json()
  const submission = data?.result?.data?.json

  if (!submission) {
    return <div>未找到该提交记录</div>
  }
  // Render status
}
```

### Anti-Patterns to Avoid

- **Using `protectedProcedure` for external endpoints:** This throws `UNAUTHORIZED` for any user without a session. All external intake endpoints MUST use `baseProcedure`.
- **Putting submit pages inside `(dashboard)/` route group:** The dashboard layout calls `verifySession()` which redirects unauthenticated users to `/login`. External submitters never have a session.
- **Storing token in plain text without index:** Token lookups happen on every status page load. The `@@index([token])` and `@unique` constraint are both required.
- **Using `createdBy` as a real user ID for external requirements:** The `createdBy` field on `Requirement` is a `String` (not a foreign key enforced by Prisma). Using a sentinel string like `'external'` is safe and already consistent with how the field is used elsewhere. Do NOT try to create a real User row for external submitters.
- **Showing token only in browser history / query param:** Token must be shown in a prominent copy-to-clipboard UI element. Never embed it only in a redirect URL without explicit display.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Unguessable ID generation | Custom random string generator | `crypto.randomUUID()` | Node/browser built-in, cryptographically random, UUID v4 format |
| Input sanitization | Custom strip-HTML function | Zod `.trim()` + `.max()` constraints | Already in project, catches injection at schema boundary |
| CSRF on public form | Custom nonce system | Not needed — no session cookies involved in external flow | Public forms without session auth are not CSRF targets because there is no ambient credential to abuse |
| Rate limiting on submission | Custom in-memory counter | Middleware `X-Forwarded-For` check (basic) or accept no rate limiting for v1 | Internal tool with 5-15 person team — rate limiting is low priority for v1 |

**Key insight:** The form is intentionally simple. Resist the urge to add CAPTCHA, email verification, or account creation in this phase. All of that is out of scope per EXT-01.

---

## Common Pitfalls

### Pitfall 1: Auth Redirect on Submit Page

**What goes wrong:** Developer adds the submit page inside `(dashboard)/` route group. The layout calls `verifySession()` which redirects unauthenticated users to `/login`. External submitters get 302'd to login, never see the form.

**Why it happens:** All existing pages are inside `(dashboard)/`, muscle memory puts new pages there.

**How to avoid:** Create `src/app/submit/` at the app root — a sibling of `(dashboard)/` and `(auth)/`, not a child of either.

**Warning signs:** Accessing `/submit` in an incognito tab redirects to `/login`.

### Pitfall 2: baseProcedure vs protectedProcedure

**What goes wrong:** The external router imports `protectedProcedure` instead of `baseProcedure`. All calls from unauthenticated clients receive 401.

**Why it happens:** Every existing router uses `protectedProcedure` — copy-paste error.

**How to avoid:** Explicitly import and use `baseProcedure` in `external.ts`. Add a comment: `// baseProcedure: intentionally unauthenticated`.

**Warning signs:** `fetch('/api/trpc/external.submit')` returns `{ error: { code: 'UNAUTHORIZED' } }` in an incognito window.

### Pitfall 3: Prisma Relation Conflict on `createdBy`

**What goes wrong:** Developer tries to set `createdBy` to a non-existent userId for external submissions and gets a foreign key violation — but actually `createdBy` on `Requirement` is a plain `String` with no `@relation`, so this is not a problem.

**Why it happens:** Misreading the schema — `createdBy` looks like it should be a FK.

**How to avoid:** Check the schema: `createdBy String` — no relation. Setting `'external'` is valid.

**Warning signs:** None — this will just work.

### Pitfall 4: Token Brute-Force Risk

**What goes wrong:** Using a short token (e.g., 6 digits) makes status guessable. Attacker can enumerate all submissions.

**Why it happens:** Developer wants a "nice" short reference code.

**How to avoid:** Use `crypto.randomUUID()` (36 chars, 122 bits of entropy). Do not truncate.

**Warning signs:** Token is shorter than 20 characters.

### Pitfall 5: Missing `force-dynamic` on Status Page

**What goes wrong:** Next.js statically renders the status page at build time (or caches it). The status shown is stale.

**Why it happens:** Default behavior in App Router is to cache aggressively.

**How to avoid:** Add `export const dynamic = 'force-dynamic'` to the status page.

**Warning signs:** Status shows "DRAFT" after the requirement has been moved to "IN_REVIEW".

### Pitfall 6: No Back-Relation on Requirement Model

**What goes wrong:** Prisma migration runs but `Requirement` model doesn't have the `externalSubmission` field — causing TypeScript errors when including the relation.

**Why it happens:** Only added the `ExternalSubmission` model but forgot to add the back-relation to `Requirement`.

**How to avoid:** Add `externalSubmission ExternalSubmission?` to the `Requirement` model in `schema.prisma`.

---

## Code Examples

Verified patterns from project codebase:

### Zod Schema for External Submit Input

```typescript
// src/lib/schemas/external.ts
import { z } from 'zod'

export const ExternalSubmitSchema = z.object({
  title: z.string().min(1).max(200).trim(),
  description: z.string().min(10).max(5000).trim(),
  submitterName: z.string().min(1).max(100).trim(),
  submitterContact: z.string().max(200).trim().optional(),
})

export type ExternalSubmit = z.infer<typeof ExternalSubmitSchema>
```

### Wire external router into appRouter

```typescript
// src/server/trpc/router.ts — add:
import { externalRouter } from './routers/external'

export const appRouter = createTRPCRouter({
  // ... existing routers ...
  external: externalRouter,
})
```

### Status display labels (Chinese UI consistency)

```typescript
// Consistent with existing Chinese UI pattern
const STATUS_LABELS: Record<string, string> = {
  DRAFT: '待处理',
  IN_REVIEW: '评审中',
  CONSENSUS: '已达成共识',
  IMPLEMENTING: '实现中',
  DONE: '已完成',
}
```

### Event bus — emit requirement.created for external submissions

```typescript
// Same event shape as protectedProcedure requirement.create
// Source: src/server/trpc/routers/requirement.ts:45-48
eventBus.emit('requirement.created', {
  requirementId: requirement.id,
  createdBy: 'external',
})
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Session-only auth | `baseProcedure` already available in tRPC init | Phase 1 | No new auth infrastructure needed |
| All routes inside `(dashboard)` | Route groups in Next.js App Router | App Router design | Public pages are siblings, not children, of `(dashboard)` |

**Deprecated/outdated:**
- Nothing applies here — this is a new feature, no migration needed.

---

## Open Questions

1. **Should the submitter receive an email with their status link?**
   - What we know: Email is already set up via Resend in Phase 7. `send-status-change-email.ts` exists.
   - What's unclear: EXT-01/EXT-02 don't mention email delivery. Submitter contact field is optional.
   - Recommendation: Make `submitterContact` an optional email field. If present, send a confirmation email with the status link after submission. Implement in 08-01 as an optional enhancement. Keep it fire-and-forget so it doesn't block the submission response.

2. **Should external submissions appear in the main requirements list?**
   - What we know: `requirement.list` uses `protectedProcedure` and shows all requirements. External submissions create real `Requirement` rows.
   - What's unclear: Whether internal users want external submissions mixed into their working queue.
   - Recommendation: They should appear — that's the point (team processes them). No filter needed. The `createdBy: 'external'` sentinel will be visible in any list view that shows creator.

3. **Token expiry?**
   - What we know: `ExternalSubmission` model has no `expiresAt` field in the proposed design.
   - What's unclear: Requirements don't mention expiry. But a never-expiring token is a minor information disclosure risk.
   - Recommendation: No expiry for v1. Keep it simple. Add expiry in v2 if needed.

---

## Validation Architecture

> `workflow.nyquist_validation` is not set in `.planning/config.json` — skip this section.

---

## Sources

### Primary (HIGH confidence)

- Project codebase `src/server/trpc/init.ts` — confirmed `baseProcedure` exists and is unauthenticated
- Project codebase `src/server/auth/session.ts` — confirmed session is cookie-based; public routes simply omit the session check
- Project codebase `prisma/schema.prisma` — confirmed `createdBy String` (no FK), `Role.EXTERNAL` exists, `Requirement` model structure
- Project codebase `src/app/(dashboard)/layout.tsx` — confirmed `verifySession()` is called in dashboard layout, blocking unauthenticated access
- Project codebase `src/server/trpc/router.ts` — confirmed router pattern for adding new sub-routers
- Project codebase `package.json` — confirmed all required libraries already installed

### Secondary (MEDIUM confidence)

- Next.js App Router docs (verified via project conventions): route groups `(folder)` control layout inheritance, not URL segments; sibling groups share no layout

### Tertiary (LOW confidence)

- None — all findings are verified from the project codebase itself.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed and in use
- Architecture patterns: HIGH — derived directly from existing codebase conventions
- Pitfalls: HIGH — derived from code inspection (e.g., `verifySession()` in layout, `protectedProcedure` pattern)
- Schema design: HIGH — consistent with existing Prisma patterns in project

**Research date:** 2026-03-02
**Valid until:** 2026-04-02 (stable stack, 30 days)
