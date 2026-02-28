# Phase 5: Workflow & Search - Research

**Researched:** 2026-03-01
**Domain:** Status state machine, full-text search, filtering (PostgreSQL + Prisma 7 + Next.js 16)
**Confidence:** HIGH

## Summary

Phase 5 adds two distinct capabilities to DevOS: (1) a requirement lifecycle state machine that enforces valid status transitions (draft → in_review → consensus → implementing → done), and (2) search/filter functionality so users can find requirements by text query, status, tag, role, or date.

The state machine is straightforward — a pure TypeScript transition map with validation, backed by a Prisma enum migration. No external library needed; the state space is small (5 states, ~6 transitions) and a hand-rolled map is more maintainable than adding a dependency like XState for this scope.

For search, the key decision is PostgreSQL full-text search vs. ILIKE pattern matching. Prisma's built-in FTS for PostgreSQL is still a Preview feature with known limitations, and critically, PostgreSQL's default text search configurations (`english`, `simple`) have no Chinese tokenization support. Since DevOS is bilingual (Chinese/English) and the dataset is small (requirements, not millions of documents), the pragmatic approach is `ILIKE` with `pg_trgm` for trigram indexing — this handles both languages without extensions, works on Windows PostgreSQL 16, and performs well at this scale.

**Primary recommendation:** Hand-roll a typed state machine map for status transitions; use Prisma `contains` (ILIKE) for search with optional `pg_trgm` GIN index for performance; add status/date filters via standard Prisma `where` clauses. Add a `tags` field to the Requirement model for tag-based filtering.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MOD-03 | 需求状态流转：草稿 → 评审中 → 共识达成 → 实现中 → 完成 | State machine transition map, RequirementStatus enum, transitionStatus tRPC mutation with validation, status badge UI, event bus integration |
| MOD-04 | 支持全文搜索、按状态/标签/角色/日期筛选 | Prisma `contains` (ILIKE) for text search across title+rawInput, `where` clause filters for status/tags/createdBy/date, tags field addition to schema, filter bar UI component |
</phase_requirements>

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Prisma | 7.4.2 | ORM, schema migration, query builder | Already in project; `contains` mode maps to ILIKE |
| Zod | 4.3.6 | Input validation for status transitions and filter params | Already in project; validates enum values |
| tRPC | 11.0.0 | API layer for status mutation and search queries | Already in project; typed end-to-end |
| PostgreSQL | 16 | Database with `pg_trgm` extension for trigram search | Already installed; extension available by default |

### Supporting (no new installs needed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | 0.575.0 | Icons for status badges and filter controls | Already installed |
| radix-ui | 1.4.3 | Select/dropdown for status filter, popover for date picker | Already installed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| ILIKE search | Prisma `fullTextSearchPostgres` preview | Still preview for PG; no Chinese tokenization without `zhparser`/`pg_jieba` extensions (hard to install on Windows) |
| ILIKE search | Elasticsearch / Meilisearch | Massive overkill for a requirements tool with <10k records |
| Hand-rolled FSM | XState v5 | XState is powerful but adds ~15KB for 5 states; transition map is <50 lines |
| `pg_trgm` trigram | No index | Fine for <1000 records; add `pg_trgm` GIN index later if needed |

**Installation:** No new packages needed. Only a Prisma migration and optional `pg_trgm` extension.

## Architecture Patterns

### Schema Changes (Prisma migration)

```prisma
// Add to schema.prisma
enum RequirementStatus {
  DRAFT
  IN_REVIEW
  CONSENSUS
  IMPLEMENTING
  DONE
}

model Requirement {
  // ... existing fields ...
  status   RequirementStatus @default(DRAFT)  // was: String @default("draft")
  tags     String[]          @default([])      // new: array of tag strings
  // Add index for search performance
  @@index([status])
  @@index([createdBy])
  @@index([createdAt])
}
```

### Recommended File Structure
```
src/
├── lib/
│   └── workflow/
│       ├── status-machine.ts    # Transition map + validation
│       └── status-labels.ts     # Chinese display labels + badge colors
├── server/
│   └── trpc/
│       └── routers/
│           └── requirement.ts   # Extended: transitionStatus, search, addTag, removeTag
└── app/
    └── (dashboard)/
        └── requirements/
            ├── page.tsx              # Enhanced: search bar + filter controls
            ├── search-filters.tsx    # Client component: search input + filter dropdowns
            └── [id]/
                └── status-control.tsx  # Status badge + transition buttons
```

### Pattern 1: Typed State Machine Map

**What:** A `Record<Status, Status[]>` that defines which transitions are valid from each state.
**When to use:** Any time you have a small, well-defined set of states with explicit transitions.

```typescript
// src/lib/workflow/status-machine.ts
import { z } from 'zod'

export const RequirementStatus = z.enum([
  'DRAFT', 'IN_REVIEW', 'CONSENSUS', 'IMPLEMENTING', 'DONE'
])
export type RequirementStatus = z.infer<typeof RequirementStatus>

const TRANSITIONS: Record<RequirementStatus, readonly RequirementStatus[]> = {
  DRAFT:        ['IN_REVIEW'],
  IN_REVIEW:    ['CONSENSUS', 'DRAFT'],     // can return to draft
  CONSENSUS:    ['IMPLEMENTING', 'IN_REVIEW'], // can reopen review
  IMPLEMENTING: ['DONE', 'CONSENSUS'],       // can revert if blocked
  DONE:         [],                           // terminal state
} as const

export function canTransition(from: RequirementStatus, to: RequirementStatus): boolean {
  return TRANSITIONS[from].includes(to)
}

export function getValidTransitions(current: RequirementStatus): readonly RequirementStatus[] {
  return TRANSITIONS[current]
}

export function assertTransition(from: RequirementStatus, to: RequirementStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid transition: ${from} -> ${to}`)
  }
}
```

### Pattern 2: Prisma `contains` for Bilingual Search

**What:** Use Prisma's `contains` with `mode: 'insensitive'` which maps to PostgreSQL `ILIKE`.
**When to use:** Text search across title and rawInput fields, supporting both Chinese and English.

```typescript
// In tRPC router — search procedure
const where: Prisma.RequirementWhereInput = {
  AND: [
    // Text search across title and rawInput
    query ? {
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { rawInput: { contains: query, mode: 'insensitive' } },
      ],
    } : {},
    // Status filter
    status ? { status } : {},
    // Tag filter (has ANY of the specified tags)
    tags?.length ? { tags: { hasSome: tags } } : {},
    // Creator filter
    createdBy ? { createdBy } : {},
    // Date range filter
    dateFrom ? { createdAt: { gte: dateFrom } } : {},
    dateTo ? { createdAt: { lte: dateTo } } : {},
  ],
}
```

### Anti-Patterns to Avoid
- **String-based status without validation:** The current schema uses `String @default("draft")` — migrate to a proper enum to get DB-level constraint enforcement.
- **Client-side transition validation only:** Always validate transitions server-side in the tRPC mutation. Client-side checks are UX convenience, not security.
- **Full-text search for Chinese without tokenizer:** PostgreSQL's `to_tsvector('simple', ...)` splits on whitespace — Chinese text has no spaces, so it becomes one giant token. Use ILIKE instead.
- **Searching JSON fields:** Don't try to search inside the `model` Json column with ILIKE. It's unstructured and slow. Search `title` and `rawInput` only.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Dropdown/select UI | Custom select component | Radix UI Select | Keyboard navigation, accessibility, portal rendering |
| Date range picker | Custom date inputs | Two `<input type="date">` elements | Native browser date picker is sufficient for this use case |
| URL query state sync | Manual URLSearchParams | Next.js `useSearchParams` + `useRouter` | Handles encoding, history, SSR hydration |
| Debounced search input | setTimeout/clearTimeout | `useDeferredValue` or simple `useRef` debounce | React 19 `useDeferredValue` handles concurrent rendering correctly |

**Key insight:** The search/filter UI is standard CRUD filtering — no exotic patterns needed. Lean on Prisma's `where` clause composition and Next.js URL state.

## Common Pitfalls

### Pitfall 1: Enum Migration on Existing Data
**What goes wrong:** Changing `status String` to `status RequirementStatus` fails if existing rows have values that don't match the enum.
**Why it happens:** Existing rows have lowercase `"draft"` but the enum expects `DRAFT`.
**How to avoid:** Write a two-step migration: (1) UPDATE existing rows to uppercase values, (2) ALTER COLUMN to enum type. Prisma's `prisma migrate dev` will generate the SQL, but you may need to customize it.
**Warning signs:** Migration fails with "invalid input value for enum".

### Pitfall 2: Search Performance on JSON Columns
**What goes wrong:** Attempting to search inside the `model` Json column with ILIKE is extremely slow and unreliable.
**Why it happens:** Json columns are stored as JSONB in PostgreSQL — ILIKE requires casting to text first, which defeats indexing.
**How to avoid:** Only search `title` and `rawInput` (both are plain text columns). If model content search is needed later, extract searchable text into a dedicated column.
**Warning signs:** Queries taking >500ms on small datasets.

### Pitfall 3: Chinese Text and PostgreSQL FTS
**What goes wrong:** `to_tsvector('simple', '用户登录功能')` produces a single token for the entire string because there are no word boundaries.
**Why it happens:** PostgreSQL's built-in text search configs split on whitespace/punctuation. Chinese has no spaces between words.
**How to avoid:** Use ILIKE (`contains`) which does substring matching regardless of language. It works for both `"登录"` matching `"用户登录功能"` and `"login"` matching `"User login feature"`.
**Warning signs:** Chinese search queries returning zero results despite matching content existing.

### Pitfall 4: Filter State Lost on Navigation
**What goes wrong:** User applies filters, clicks a requirement, presses back — filters are gone.
**Why it happens:** Filter state stored only in React state, not in the URL.
**How to avoid:** Sync all filter state to URL search params (`?q=xxx&status=DRAFT&tag=auth`). Use `useSearchParams` to read and `router.push` to update.
**Warning signs:** Users complaining about losing their search context.

### Pitfall 5: Race Conditions in Status Transitions
**What goes wrong:** Two users simultaneously transition the same requirement, resulting in an invalid state.
**Why it happens:** Read-then-write without atomicity — both read "DRAFT", both write "IN_REVIEW".
**How to avoid:** Use Prisma `$transaction` with a `where` clause that includes the expected current status. If the row doesn't match, the update affects 0 rows.
**Warning signs:** Status jumping unexpectedly or audit log showing impossible transitions.

## Code Examples

### Status Transition tRPC Mutation

```typescript
// In requirement router
transitionStatus: protectedProcedure
  .input(z.object({
    id: z.string(),
    to: RequirementStatus,
  }))
  .mutation(async ({ input, ctx }) => {
    const requirement = await prisma.requirement.findUniqueOrThrow({
      where: { id: input.id },
      select: { status: true },
    })

    assertTransition(
      requirement.status as RequirementStatus,
      input.to
    )

    const updated = await prisma.requirement.update({
      where: { id: input.id, status: requirement.status }, // optimistic lock
      data: { status: input.to },
    })

    eventBus.emit('requirement.status.changed', {
      requirementId: input.id,
      from: requirement.status,
      to: input.to,
      changedBy: ctx.session.userId,
    })

    return updated
  }),
```

### Search + Filter tRPC Query

```typescript
// In requirement router
search: protectedProcedure
  .input(z.object({
    query: z.string().optional(),
    status: RequirementStatus.optional(),
    tags: z.array(z.string()).optional(),
    createdBy: z.string().optional(),
    dateFrom: z.coerce.date().optional(),
    dateTo: z.coerce.date().optional(),
  }).optional())
  .query(async ({ input }) => {
    const { query, status, tags, createdBy, dateFrom, dateTo } = input ?? {}

    return prisma.requirement.findMany({
      where: {
        AND: [
          query ? {
            OR: [
              { title: { contains: query, mode: 'insensitive' } },
              { rawInput: { contains: query, mode: 'insensitive' } },
            ],
          } : {},
          status ? { status } : {},
          tags?.length ? { tags: { hasSome: tags } } : {},
          createdBy ? { createdBy } : {},
          dateFrom ? { createdAt: { gte: dateFrom } } : {},
          dateTo ? { createdAt: { lte: dateTo } } : {},
        ],
      },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        rawInput: true,
        status: true,
        tags: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true,
        version: true,
      },
    })
  }),
```

### Status Labels (Chinese)

```typescript
// src/lib/workflow/status-labels.ts
import type { RequirementStatus } from './status-machine'

export const STATUS_LABELS: Record<RequirementStatus, string> = {
  DRAFT: '草稿',
  IN_REVIEW: '评审中',
  CONSENSUS: '共识达成',
  IMPLEMENTING: '实现中',
  DONE: '完成',
}

export const STATUS_COLORS: Record<RequirementStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  IN_REVIEW: 'bg-yellow-100 text-yellow-800',
  CONSENSUS: 'bg-blue-100 text-blue-800',
  IMPLEMENTING: 'bg-purple-100 text-purple-800',
  DONE: 'bg-green-100 text-green-800',
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Prisma `fullTextSearch` preview for PG | Still preview in Prisma v6/v7 | Unchanged since v2.30 | Use ILIKE for bilingual search instead |
| XState for all state machines | XState v5 for complex, hand-rolled for simple | XState v5 (2024) | 5-state FSM doesn't justify the dependency |
| `String` status field | Prisma `enum` with DB-level constraint | Best practice | Prevents invalid values at database level |

**Deprecated/outdated:**
- Prisma `fullTextSearch` for PostgreSQL: Still preview, not GA. Works for English but not Chinese without extensions.

## Open Questions

1. **Tag taxonomy: free-form or predefined?**
   - What we know: MOD-04 says "filter by tag" but doesn't specify whether tags are user-created or from a fixed list.
   - What's unclear: Should there be a Tag model with predefined values, or just a `String[]` on Requirement?
   - Recommendation: Start with free-form `String[]` tags. A predefined taxonomy can be added later if needed. Free-form is simpler and more flexible for v1.

2. **"Role" filter — what does it mean?**
   - What we know: MOD-04 says "filter by role". The `createdBy` field stores a userId, not a role.
   - What's unclear: Does "filter by role" mean "show requirements created by users with role X" or "show requirements assigned to role X"?
   - Recommendation: Implement as "filter by creator's role" — join through User → UserRole to find requirements created by users with a specific role. This requires no schema change.

3. **Backward transition policy**
   - What we know: The success criteria say "invalid transitions are blocked" but don't specify which backward transitions are valid.
   - What's unclear: Can a requirement go from CONSENSUS back to IN_REVIEW? From IMPLEMENTING back to CONSENSUS?
   - Recommendation: Allow backward transitions one step (IN_REVIEW→DRAFT, CONSENSUS→IN_REVIEW, IMPLEMENTING→CONSENSUS) but not DONE→anything. This matches typical agile workflows.

## Sources

### Primary (HIGH confidence)
- Prisma schema.prisma — existing project schema (local file)
- Prisma v6 FTS docs — https://www.prisma.io/docs/v6/orm/prisma-client/queries/full-text-search — confirms PostgreSQL FTS still preview
- PostgreSQL 16 text search docs — https://www.postgresql.org/docs/16/textsearch-controls.html — confirms no built-in Chinese tokenization

### Secondary (MEDIUM confidence)
- Prisma `contains` mode documentation — maps to ILIKE in PostgreSQL, case-insensitive substring match
- pg_trgm extension — available by default in PostgreSQL 16, provides GIN index for ILIKE performance
- XState vs hand-rolled FSM comparison — community consensus: XState for complex statecharts, plain map for simple FSMs

### Tertiary (LOW confidence)
- pg_jieba / zhparser for Chinese FTS — exist but require C extension compilation, impractical on Windows dev environment

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new dependencies, all patterns verified against existing codebase
- Architecture: HIGH - follows established project patterns (tRPC router, Prisma queries, event bus)
- Pitfalls: HIGH - Chinese FTS limitation verified against PostgreSQL docs; enum migration is well-documented
- Search approach: HIGH - ILIKE is proven for small bilingual datasets; pg_trgm available if needed

**Research date:** 2026-03-01
**Valid until:** 2026-04-01 (stable domain, no fast-moving dependencies)
