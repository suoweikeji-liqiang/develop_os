# Phase 6: Role Views & Consensus - Research

**Researched:** 2026-03-01
**Domain:** Multi-role requirement views, consensus sign-off workflow
**Confidence:** HIGH

## Summary

Phase 6 adds two capabilities to the existing requirement detail page: (1) role-specific views that tailor the five-layer model display per role (product/dev/test/UI), and (2) a consensus sign-off workflow that gates the IN_REVIEW -> CONSENSUS status transition behind all required roles signing off.

The existing codebase already has the Role enum (PRODUCT, DEV, TEST, UI, EXTERNAL), UserRole join table, session context with roles array, and a status machine with the IN_REVIEW -> CONSENSUS transition. The work is primarily: a new Prisma model for sign-off records, role-view configuration mapping, a sign-off tRPC router, and UI components for role-filtered views and sign-off status display.

**Primary recommendation:** Use a `ReviewSignoff` Prisma model to track per-requirement, per-role sign-offs with checklist completion. Gate the CONSENSUS transition in the existing `transitionStatus` mutation by querying sign-off completeness. Role views are a pure frontend concern -- a config map determines which five-layer model fields each role sees prominently.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| COL-01 | 产品/开发/测试/UI 各角色可查看同一需求模型的角色专属视图 | Role-view config map per role, tab reordering + emphasis, role-specific checklist items |
| COL-02 | 各角色按职责签字确认，全部签字才能推进状态 | ReviewSignoff Prisma model, sign-off tRPC mutations, consensus gate on transitionStatus |
</phase_requirements>

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Prisma | 7.4.2 | ORM -- new ReviewSignoff model + migration | Already used for all data models |
| tRPC | 11.0.0 | API layer -- sign-off router | Already used for all mutations/queries |
| Zod | 4.3.6 | Schema validation -- sign-off input/checklist schemas | Already used project-wide |
| React 19 | 19.2.3 | UI -- role view components | Already used |
| Next.js | 16.1.6 | Server components for session-aware role detection | Already used |
| Tailwind CSS | 4.x | Styling role-specific UI elements | Already used |

### Supporting (already installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | 0.575.0 | Icons for sign-off status (check, clock, user) | Sign-off status indicators |
| radix-ui | 1.4.3 | Accessible checkbox, tooltip for checklist UI | Review checklist components |
| eventemitter3 | 5.0.4 | Event bus for sign-off events | Emit signoff.completed events |

### No New Dependencies Needed

All required functionality can be built with the existing stack. No new npm packages are needed for Phase 6.

## Architecture Patterns

### Recommended New Files
```
src/
├── lib/roles/
│   ├── role-view-config.ts
│   └── role-checklist-config.ts
├── server/trpc/routers/
│   └── signoff.ts
└── app/(dashboard)/requirements/[id]/
    ├── role-view-tabs.tsx
    ├── review-checklist.tsx
    ├── signoff-panel.tsx
    └── consensus-status.tsx
```

### Pattern 1: Role-View Configuration Map (COL-01)
**What:** A static TypeScript config that maps each Role to its view preferences -- which five-layer tabs to show first, which fields to emphasize, and which to collapse.
**When to use:** When rendering the requirement detail page for a logged-in user.
**Why this approach:** The same FiveLayerModel data is displayed to all roles. The difference is presentation priority, not data access. This keeps it simple -- no server-side filtering, no separate API endpoints.

```typescript
// src/lib/roles/role-view-config.ts
import type { Role } from '@/lib/definitions'

type LayerKey = 'goal' | 'assumption' | 'behavior' | 'scenario' | 'verifiability'

interface RoleViewConfig {
  readonly label: string
  readonly primaryTabs: readonly LayerKey[]   // Shown first / expanded
  readonly secondaryTabs: readonly LayerKey[] // Shown but collapsed
  readonly emphasisFields: Record<string, readonly string[]> // layer -> fields to highlight
}

const ROLE_VIEWS: Record<Exclude<Role, 'EXTERNAL'>, RoleViewConfig> = {
  PRODUCT: {
    label: '产品视角',
    primaryTabs: ['goal', 'assumption', 'scenario'],
    secondaryTabs: ['behavior', 'verifiability'],
    emphasisFields: {
      goal: ['summary', 'metrics'],
      assumption: ['items'],
      scenario: ['normal'],
    },
  },
  DEV: {
    label: '开发视角',
    primaryTabs: ['behavior', 'scenario', 'verifiability'],
    secondaryTabs: ['goal', 'assumption'],
    emphasisFields: {
      behavior: ['actors', 'actions'],
      scenario: ['edge', 'error'],
      verifiability: ['automated'],
    },
  },
  TEST: {
    label: '测试视角',
    primaryTabs: ['verifiability', 'scenario', 'behavior'],
    secondaryTabs: ['goal', 'assumption'],
    emphasisFields: {
      verifiability: ['automated', 'manual'],
      scenario: ['normal', 'edge', 'error'],
    },
  },
  UI: {
    label: 'UI视角',
    primaryTabs: ['goal', 'behavior', 'scenario'],
    secondaryTabs: ['assumption', 'verifiability'],
    emphasisFields: {
      goal: ['before', 'after'],
      behavior: ['actors', 'actions'],
      scenario: ['normal'],
    },
  },
} as const
```

### Pattern 2: ReviewSignoff Prisma Model (COL-02)
**What:** A database model that records each role's sign-off on a requirement, with checklist completion stored as JSON.
**When to use:** When a user with a specific role signs off on a requirement during the IN_REVIEW phase.

```prisma
// Addition to prisma/schema.prisma
model ReviewSignoff {
  id            String      @id @default(cuid())
  requirementId String
  role          Role
  userId        String
  checklist     Json        // { items: [{ key: string, label: string, checked: boolean }] }
  signedAt      DateTime    @default(now())

  requirement   Requirement @relation(fields: [requirementId], references: [id], onDelete: Cascade)
  user          User        @relation(fields: [userId], references: [id])

  @@unique([requirementId, role])
  @@index([requirementId])
}
```

**Key design decisions:**
- `@@unique([requirementId, role])` ensures one sign-off per role per requirement
- `checklist` as Json allows flexible per-role checklist items without extra tables
- `signedAt` records when the sign-off happened for audit trail
- Relation to both Requirement and User for traceability

### Pattern 3: Consensus Gate on Status Transition
**What:** Modify the existing `transitionStatus` mutation to check sign-off completeness before allowing IN_REVIEW -> CONSENSUS.
**When to use:** Every time someone attempts to advance a requirement past IN_REVIEW.

```typescript
// Inside requirement.transitionStatus mutation (modified)
// Before allowing IN_REVIEW -> CONSENSUS:
const REQUIRED_ROLES: Role[] = ['PRODUCT', 'DEV', 'TEST', 'UI']

if (current.status === 'IN_REVIEW' && input.to === 'CONSENSUS') {
  const signoffs = await prisma.reviewSignoff.findMany({
    where: { requirementId: input.id },
    select: { role: true },
  })
  const signedRoles = new Set(signoffs.map(s => s.role))
  const missing = REQUIRED_ROLES.filter(r => !signedRoles.has(r))
  if (missing.length > 0) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: `Missing sign-offs: ${missing.join(', ')}`,
    })
  }
}
```

### Pattern 4: Role-Specific Review Checklist
**What:** Static config defining what each role should verify before signing off.
**When to use:** Displayed in the sign-off panel when a user is reviewing a requirement.

```typescript
// src/lib/roles/role-checklist-config.ts
import type { Role } from '@/lib/definitions'

interface ChecklistItem {
  readonly key: string
  readonly label: string
}

const ROLE_CHECKLISTS: Record<Exclude<Role, 'EXTERNAL'>, readonly ChecklistItem[]> = {
  PRODUCT: [
    { key: 'goal-clear', label: '目标描述清晰且可衡量' },
    { key: 'metrics-defined', label: '成功指标已定义' },
    { key: 'assumptions-reviewed', label: '假设已审查并标注置信度' },
    { key: 'scenarios-complete', label: '核心场景覆盖完整' },
  ],
  DEV: [
    { key: 'behavior-feasible', label: '行为描述技术可行' },
    { key: 'edge-cases', label: '边界场景已考虑' },
    { key: 'error-handling', label: '错误处理路径已定义' },
    { key: 'no-ambiguity', label: '无歧义的实现描述' },
  ],
  TEST: [
    { key: 'verifiable', label: '验证标准可执行' },
    { key: 'automated-criteria', label: '自动化测试标准已定义' },
    { key: 'manual-justified', label: '手动测试项有合理理由' },
    { key: 'scenarios-testable', label: '所有场景可测试' },
  ],
  UI: [
    { key: 'user-flow', label: '用户流程清晰' },
    { key: 'actors-defined', label: '交互角色已明确' },
    { key: 'states-covered', label: '前后状态变化已描述' },
    { key: 'edge-ui', label: '异常状态UI处理已考虑' },
  ],
} as const
```

### Pattern 5: Session-Aware Role Detection
**What:** Pass the current user's roles from the server component to client components so the UI can adapt.
**When to use:** In the requirement detail page server component.

The existing `verifySession()` in `src/lib/dal.ts` already returns `{ userId, roles, isAdmin }`. The `getSession()` function in `src/server/auth/session.ts` already includes `roles: session.user.roles.map((r) => r.role)`. This means the server component `page.tsx` can pass `roles` directly to `RequirementDetailClient` without any new server-side work.

```typescript
// In page.tsx (existing pattern, just pass roles through)
const session = await verifySession()
// session.roles is already string[] e.g. ['PRODUCT', 'DEV']
// Pass to RequirementDetailClient as new prop: userRoles={session.roles}
```

### Anti-Patterns to Avoid
- **Separate API endpoints per role:** All roles see the same data model. Don't create `/api/product-view` and `/api/dev-view`. Use one data source, different presentation.
- **Storing view preferences in DB:** Role view configs are static business logic, not user preferences. Keep them as TypeScript constants.
- **Client-side role detection:** Always pass roles from server component via `verifySession()`. Never trust client-side role claims.
- **Deleting sign-offs on model update:** When the model changes during IN_REVIEW, existing sign-offs should be invalidated (deleted). This prevents stale approvals on changed content.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Checklist UI | Custom checkbox group | Radix UI Checkbox (already installed) | Accessible, keyboard-navigable, ARIA-compliant |
| Role badge colors | Inline color logic | Shared ROLE_LABELS/ROLE_COLORS map (like STATUS_LABELS) | Consistent across all views |
| Optimistic lock on sign-off | Manual version checking | Prisma @@unique constraint + upsert | DB-level uniqueness prevents double sign-off |
| Event emission | Custom pub/sub | EventEmitter3 eventBus (already wired) | Consistent with existing event-driven architecture |

**Key insight:** This phase is mostly configuration and UI composition. The data model is simple (one new table), the business logic is a single gate check, and the views are presentation-layer config maps. Don't over-engineer it.

## Common Pitfalls

### Pitfall 1: Stale Sign-offs After Model Change
**What goes wrong:** A role signs off on version N of the model. The model is then updated to version N+1 while still IN_REVIEW. The old sign-off is now approving content that changed.
**Why it happens:** Sign-offs are tied to the requirement, not to a specific model version.
**How to avoid:** When the model is updated while status is IN_REVIEW, delete all existing sign-offs for that requirement. This forces re-review. Add this logic to the `updateModel` mutation.
**Warning signs:** Sign-off count stays at 4/4 after a model edit during review.

### Pitfall 2: User With Multiple Roles Signs Off Once
**What goes wrong:** A user who has both PRODUCT and DEV roles signs off once, but the system only records one role's sign-off.
**Why it happens:** The sign-off mutation takes a single role parameter, but the user may have multiple roles.
**How to avoid:** The sign-off UI should show all of the user's applicable roles and let them sign off for each role separately. Each sign-off is a distinct record (@@unique on [requirementId, role]).
**Warning signs:** Users with multiple roles can't fully sign off.

### Pitfall 3: EXTERNAL Role in Consensus
**What goes wrong:** The system requires EXTERNAL role sign-off, but external users are submitters, not reviewers.
**Why it happens:** The Role enum includes EXTERNAL, and a naive implementation requires all roles.
**How to avoid:** The REQUIRED_ROLES constant for consensus should only include PRODUCT, DEV, TEST, UI. EXTERNAL is excluded from the review process by design.
**Warning signs:** Consensus can never be reached because no EXTERNAL user signs off.

### Pitfall 4: Race Condition on Consensus Check
**What goes wrong:** Two roles sign off simultaneously. Both pass the "not yet complete" check, but the consensus gate still blocks because the count check happens before the second write commits.
**Why it happens:** Non-transactional read-then-write pattern.
**How to avoid:** Use Prisma upsert for sign-off creation (idempotent). The consensus check only happens on the explicit `transitionStatus` call, not on sign-off creation. This separates the two concerns cleanly.
**Warning signs:** Intermittent "missing sign-offs" errors when roles sign off near-simultaneously.

### Pitfall 5: Sign-off Panel Visible in Wrong Status
**What goes wrong:** The sign-off panel and checklist are shown when the requirement is in DRAFT or DONE status.
**Why it happens:** No status-based conditional rendering.
**How to avoid:** Only show the sign-off panel when status is IN_REVIEW. Show read-only sign-off history when status is CONSENSUS or later.
**Warning signs:** Users try to sign off on draft requirements.

## Code Examples

### Sign-off tRPC Router

```typescript
// src/server/trpc/routers/signoff.ts
import { z } from 'zod'
import { createTRPCRouter, protectedProcedure } from '../init'
import { prisma } from '@/server/db/client'
import { eventBus } from '@/server/events/bus'
import { TRPCError } from '@trpc/server'

const RoleEnum = z.enum(['PRODUCT', 'DEV', 'TEST', 'UI'])

const ChecklistItemSchema = z.object({
  key: z.string(),
  label: z.string(),
  checked: z.boolean(),
})

export const signoffRouter = createTRPCRouter({
  submit: protectedProcedure
    .input(z.object({
      requirementId: z.string(),
      role: RoleEnum,
      checklist: z.array(ChecklistItemSchema),
    }))
    .mutation(async ({ input, ctx }) => {
      // Verify user has this role
      const hasRole = ctx.session.roles.includes(input.role)
      if (!hasRole) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have this role',
        })
      }

      // Verify requirement is IN_REVIEW
      const req = await prisma.requirement.findUniqueOrThrow({
        where: { id: input.requirementId },
        select: { status: true },
      })
      if (req.status !== 'IN_REVIEW') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Requirement must be in review',
        })
      }

      // Verify all checklist items are checked
      const allChecked = input.checklist.every(item => item.checked)
      if (!allChecked) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'All checklist items must be checked',
        })
      }

      // Upsert sign-off (idempotent)
      const signoff = await prisma.reviewSignoff.upsert({
        where: {
          requirementId_role: {
            requirementId: input.requirementId,
            role: input.role,
          },
        },
        create: {
          requirementId: input.requirementId,
          role: input.role,
          userId: ctx.session.userId,
          checklist: input.checklist,
        },
        update: {
          userId: ctx.session.userId,
          checklist: input.checklist,
          signedAt: new Date(),
        },
      })

      eventBus.emit('requirement.signoff.submitted', {
        requirementId: input.requirementId,
        role: input.role,
        userId: ctx.session.userId,
      })

      return signoff
    }),

  list: protectedProcedure
    .input(z.object({ requirementId: z.string() }))
    .query(async ({ input }) => {
      return prisma.reviewSignoff.findMany({
        where: { requirementId: input.requirementId },
        include: { user: { select: { name: true } } },
        orderBy: { signedAt: 'asc' },
      })
    }),
})
```

### Invalidate Sign-offs on Model Update

```typescript
// Add to requirement.updateModel mutation, after the $transaction block:
// When model changes during IN_REVIEW, invalidate all sign-offs
if (requirement.status === 'IN_REVIEW') {
  await prisma.reviewSignoff.deleteMany({
    where: { requirementId: input.id },
  })
}
```

### New Event Types

```typescript
// Add to src/server/events/types.ts
'requirement.signoff.submitted': {
  requirementId: string
  role: string
  userId: string
}
'requirement.signoff.invalidated': {
  requirementId: string
  reason: 'model-updated'
}
```

## Existing Codebase Integration Points

### Files to Modify
| File | Change | Why |
|------|--------|-----|
| `prisma/schema.prisma` | Add ReviewSignoff model + relations on Requirement/User | New sign-off data storage |
| `src/server/events/types.ts` | Add signoff event types | Event-driven architecture consistency |
| `src/server/trpc/router.ts` | Register signoffRouter | Expose sign-off API |
| `src/server/trpc/routers/requirement.ts` | Add consensus gate to transitionStatus, invalidation to updateModel | Business logic enforcement |
| `src/app/(dashboard)/requirements/[id]/page.tsx` | Pass userRoles to client component | Role-aware rendering |
| `src/app/(dashboard)/requirements/[id]/requirement-detail-client.tsx` | Add role view toggle, sign-off panel | UI integration |

### Existing Context Available
| Resource | Location | What It Provides |
|----------|----------|-----------------|
| Role enum | `prisma/schema.prisma` line 18-24 | PRODUCT, DEV, TEST, UI, EXTERNAL |
| UserRole join table | `prisma/schema.prisma` line 38-46 | userId + role mapping |
| Session with roles | `src/server/auth/session.ts` line 47 | `roles: session.user.roles.map((r) => r.role)` |
| verifySession() | `src/lib/dal.ts` | Returns `{ userId, roles, isAdmin }` |
| Status machine | `src/lib/workflow/status-machine.ts` | IN_REVIEW -> CONSENSUS transition already defined |
| protectedProcedure | `src/server/trpc/init.ts` | `ctx.session` with userId, roles, isAdmin |
| Status labels (Chinese) | `src/lib/workflow/status-labels.ts` | STATUS_LABELS and STATUS_COLORS maps |
| Event bus | `src/server/events/bus.ts` | EventEmitter3 singleton pattern |

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Separate data models per role | Single model + presentation config | Standard practice | Simpler data layer, no sync issues |
| Manual approval tracking | DB-backed sign-off with unique constraints | Standard practice | Audit trail, race-condition safe |
| Client-side role checks | Server component role injection | Next.js App Router | Secure, no client-side spoofing |

## Open Questions

1. **Should sign-off require all checklist items checked, or allow partial sign-off?**
   - What we know: The requirement says "各角色按职责签字确认" which implies full confirmation
   - Recommendation: Require all items checked before sign-off is accepted. Simpler and safer.

2. **Should backward status transition (CONSENSUS -> IN_REVIEW) clear sign-offs?**
   - What we know: The status machine allows CONSENSUS -> IN_REVIEW backward transition
   - Recommendation: Yes, clear all sign-offs when moving back to IN_REVIEW. Forces fresh review cycle.

3. **What happens if a role has no assigned users?**
   - What we know: The system requires all 4 roles to sign off
   - Recommendation: The consensus check should verify that at least one user exists for each required role. If a role has no users, surface a warning but don't block indefinitely.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `prisma/schema.prisma` -- Role enum, UserRole model, Requirement model
- Codebase analysis: `src/server/auth/session.ts` -- Session includes roles array
- Codebase analysis: `src/lib/workflow/status-machine.ts` -- IN_REVIEW -> CONSENSUS transition
- Codebase analysis: `src/server/trpc/init.ts` -- protectedProcedure ctx.session shape
- Codebase analysis: `src/server/trpc/routers/requirement.ts` -- transitionStatus mutation pattern
- Codebase analysis: `src/app/(dashboard)/requirements/[id]/requirement-detail-client.tsx` -- existing UI composition

### Secondary (MEDIUM confidence)
- Prisma 7 upsert with compound unique keys -- verified via existing codebase patterns
- Radix UI Checkbox accessibility -- installed in project (radix-ui 1.4.3)

### Tertiary (LOW confidence)
- None -- all findings based on direct codebase analysis

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already installed, no new dependencies
- Architecture: HIGH - patterns derived from direct codebase analysis of existing conventions
- Pitfalls: HIGH - identified from concrete code paths (status machine, model update, role system)

**Research date:** 2026-03-01
**Valid until:** 2026-03-31 (stable domain, no external dependency changes expected)
