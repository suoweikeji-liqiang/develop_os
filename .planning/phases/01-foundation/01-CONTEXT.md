# Phase 1: Foundation - Context

**Gathered:** 2026-02-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can authenticate, the system has role-based access, and the technical backbone (event bus, database, project structure) is operational. This phase delivers INF-01 (user auth & role management) and INF-02 (event-driven architecture).

</domain>

<decisions>
## Implementation Decisions

### Auth & Registration Flow
- Email + password authentication
- First-user bootstrap: first registered user becomes admin automatically
- After bootstrap: invite-only registration (admin sends invite links)
- Server-side sessions stored in database, cookie-based
- Password recovery via email reset link

### Role & Permission Model
- 5 fixed roles: product, dev, test, UI, external
- Users can hold multiple roles simultaneously (small teams wear multiple hats)
- Admin-only role assignment
- Role assigned at invite time (admin picks role when sending invite)

### Database & Requirement Schema
- Five-layer requirement model stored as JSONB column (flexible, schema-on-read)
- Minimal schema for Phase 1: user/role tables + requirement model table only
- English code and database fields, Chinese UI labels
- Local PostgreSQL for development

### Event Bus Conventions
- Synchronous in-process EventEmitter (EventEmitter3)
- Event naming: `domain.entity.action` pattern (e.g., `user.registered`, `requirement.created`)
- Define only Phase 1 events (no premature catalog)
- Strongly typed events with TypeScript interfaces for payloads

### Claude's Discretion
- Exact Prisma schema field naming and indexes
- Session expiration duration
- Invite link expiration policy
- Email sending implementation (provider choice)
- Project scaffolding structure (monorepo layout, folder conventions)

</decisions>

<specifics>
## Specific Ideas

- Research recommended Next.js 15 + TypeScript + Prisma 6 + tRPC 11 stack
- Research recommended EventEmitter3 for in-process event bus
- The five-layer model (Goal/Assumption/Behavior/Scenario/Verifiability) schema will evolve — JSONB gives room to iterate without migrations

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-02-28*
