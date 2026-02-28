# Phase 1: Foundation - Research

**Researched:** 2026-02-28
**Domain:** Authentication, role management, event bus infrastructure, database schema, project scaffolding
**Confidence:** HIGH

## Summary

Phase 1 delivers the technical backbone for DevOS: user authentication with email/password, role-based access control (5 fixed roles with multi-role support), an in-process event bus for module decoupling, and the initial PostgreSQL database schema including the JSONB-based requirement model table. The stack is Next.js 15 App Router + TypeScript + Prisma 6 + tRPC 11 + EventEmitter3, all well-documented and production-proven.

The key architectural decisions are already locked by the user: server-side database sessions with cookies (not JWT-only stateless), invite-only registration after first-user bootstrap, and synchronous EventEmitter3 for the event bus. Research confirms these are sound choices for a 5-15 person internal tool. The main discretion areas are Prisma schema details, session/invite expiration policies, email provider choice, and project folder structure.

**Primary recommendation:** Use the Next.js official authentication patterns (Server Actions + DAL + jose for session encryption) with Prisma for session storage, bcrypt for password hashing, and a `src/` directory structure with module-based organization matching the event-driven architecture.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Email + password authentication
- First-user bootstrap: first registered user becomes admin automatically
- After bootstrap: invite-only registration (admin sends invite links)
- Server-side sessions stored in database, cookie-based
- Password recovery via email reset link
- 5 fixed roles: product, dev, test, UI, external
- Users can hold multiple roles simultaneously (small teams wear multiple hats)
- Admin-only role assignment
- Role assigned at invite time (admin picks role when sending invite)
- Five-layer requirement model stored as JSONB column (flexible, schema-on-read)
- Minimal schema for Phase 1: user/role tables + requirement model table only
- English code and database fields, Chinese UI labels
- Local PostgreSQL for development
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

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INF-01 | User authentication & role management (product/dev/test/UI/external) | Next.js Server Actions auth pattern, Prisma session storage, bcrypt hashing, multi-role junction table, admin bootstrap logic |
| INF-02 | Event-driven architecture, modules communicate through event bus | EventEmitter3 with TypeScript generics for typed events, `domain.entity.action` naming convention, Phase 1 event catalog |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js (App Router) | ^15.x | Full-stack framework | Server Actions for auth forms, Server Components for role-based rendering, API routes for tRPC |
| TypeScript | ^5.x | Type safety | Shared types for event payloads, session data, role enums |
| Prisma | ^6.x | ORM + migrations | Type-safe DB access, JSON field support for JSONB, migration management |
| tRPC | ^11.x | Type-safe API layer | End-to-end type safety for auth/role endpoints, React Server Component support |
| EventEmitter3 | ^5.x | In-process event bus | Lightweight, high-performance, built-in TypeScript definitions |
| PostgreSQL | 16+ | Primary database | JSONB for requirement model, session storage, relational integrity for users/roles |
| Zod | ^3.x | Schema validation | Form validation, API input validation, shared with tRPC procedures |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| jose | ^5.x | Session encryption | Encrypt session ID in cookie (JWT-based encryption, Edge-compatible) |
| bcrypt | ^5.x | Password hashing | Hash passwords before storage; 10 salt rounds default |
| server-only | ^0.0.1 | Server boundary | Mark session/auth modules as server-only to prevent client leakage |
| @tanstack/react-query | ^5.x | Server state cache | Client-side data fetching for user/role data via tRPC |
| Tailwind CSS | ^4.x | Styling | Utility-first CSS for auth forms and admin UI |
| shadcn/ui | latest | UI components | Accessible form inputs, dialogs, dropdowns for role management |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| bcrypt | argon2 | Argon2 is theoretically stronger (PHC winner, memory-hard) but bcrypt is simpler to deploy on all platforms, no native compilation issues on Windows. bcrypt is sufficient for an internal tool. |
| jose (stateless cookie) | iron-session | iron-session is simpler API but less flexible. jose gives more control over token structure and is recommended by Next.js official docs. |
| Custom auth | Auth.js v5 | Auth.js adds complexity for simple email/password. User locked decision is custom auth with database sessions — Auth.js is overkill here. |
| Prisma | Drizzle | Drizzle is lighter but Prisma has better JSON field support and migration tooling. User already decided on Prisma 6. |

**Installation:**
```bash
# Core
npm install next@latest react@latest react-dom@latest typescript@latest
npm install @prisma/client zod
npm install -D prisma @types/react @types/node

# Auth
npm install jose bcrypt server-only
npm install -D @types/bcrypt

# API
npm install @trpc/server @trpc/client @trpc/react-query @tanstack/react-query

# Event bus
npm install eventemitter3

# UI
npm install tailwindcss
npx shadcn@latest init

# Dev
npm install -D vitest eslint prettier
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/             # Auth route group (login, register, invite)
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── invite/[token]/page.tsx
│   ├── (dashboard)/        # Protected route group
│   │   ├── layout.tsx      # Auth check wrapper
│   │   └── admin/
│   │       └── users/page.tsx  # Role management UI
│   ├── api/
│   │   └── trpc/[trpc]/route.ts
│   └── layout.tsx          # Root layout
├── server/                 # Server-side modules
│   ├── auth/               # Auth module
│   │   ├── session.ts      # Session create/verify/delete
│   │   ├── password.ts     # Hash/verify helpers
│   │   └── invite.ts       # Invite link generation/validation
│   ├── events/             # Event bus module
│   │   ├── bus.ts          # EventEmitter3 singleton + typed interface
│   │   └── types.ts        # Event payload type definitions
│   ├── trpc/               # tRPC setup
│   │   ├── init.ts         # createTRPCContext, baseProcedure
│   │   ├── router.ts       # Root router
│   │   └── routers/        # Domain routers
│   │       ├── auth.ts
│   │       └── user.ts
│   └── db/                 # Database
│       └── client.ts       # Prisma client singleton
├── lib/                    # Shared utilities
│   ├── dal.ts              # Data Access Layer (verifySession)
│   └── definitions.ts      # Zod schemas, TypeScript types
└── components/             # React components
    ├── ui/                 # shadcn/ui components
    └── auth/               # Auth-specific components
prisma/
├── schema.prisma           # Database schema
└── migrations/             # Migration files
```

### Pattern 1: Database Session with Encrypted Cookie
**What:** Store session in PostgreSQL via Prisma. Encrypt session ID with jose, store in HttpOnly cookie. Verify by decrypting cookie then looking up session in DB.
**When to use:** Every authenticated request.
**Source:** Next.js official authentication guide (https://nextjs.org/docs/app/guides/authentication)

```typescript
// src/server/auth/session.ts
import 'server-only'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { prisma } from '@/server/db/client'

const secretKey = new TextEncoder().encode(process.env.SESSION_SECRET)

export async function createSession(userId: string) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

  const session = await prisma.session.create({
    data: { userId, expiresAt },
  })

  const token = await new SignJWT({ sessionId: session.id })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(secretKey)

  const cookieStore = await cookies()
  cookieStore.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  })
}
```

### Pattern 2: Data Access Layer (DAL) for Auth Verification
**What:** Centralized `verifySession()` function using React `cache()` for request deduplication. All data fetching and Server Actions call this first.
**When to use:** Every server-side data access point.
**Source:** Next.js official authentication guide

```typescript
// src/lib/dal.ts
import 'server-only'
import { cache } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { jwtVerify } from 'jose'
import { prisma } from '@/server/db/client'

export const verifySession = cache(async () => {
  const cookie = (await cookies()).get('session')?.value
  if (!cookie) redirect('/login')

  const { payload } = await jwtVerify(cookie, secretKey)
  const session = await prisma.session.findUnique({
    where: { id: payload.sessionId as string },
    include: { user: { include: { roles: true } } },
  })

  if (!session || session.expiresAt < new Date()) redirect('/login')
  return { userId: session.userId, roles: session.user.roles }
})
```

### Pattern 3: Typed Event Bus
**What:** EventEmitter3 singleton with TypeScript generics for compile-time event type safety.
**When to use:** All inter-module communication.

```typescript
// src/server/events/types.ts
export interface EventMap {
  'user.registered': { userId: string; email: string }
  'user.invited': { inviteId: string; email: string; roles: string[] }
  'user.role.assigned': { userId: string; role: string; assignedBy: string }
  'session.created': { sessionId: string; userId: string }
  'session.deleted': { sessionId: string; userId: string }
  'requirement.created': { requirementId: string; createdBy: string }
}

// src/server/events/bus.ts
import EventEmitter from 'eventemitter3'
import type { EventMap } from './types'

export const eventBus = new EventEmitter<EventMap>()
```

### Pattern 4: Multi-Role Junction Table
**What:** Users and roles connected via a junction table, allowing multiple roles per user.
**When to use:** Role assignment and permission checks.

```prisma
model User {
  id        String     @id @default(cuid())
  email     String     @unique
  password  String
  name      String
  isAdmin   Boolean    @default(false)
  roles     UserRole[]
  sessions  Session[]
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt
}

model UserRole {
  id     String @id @default(cuid())
  userId String
  role   Role
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, role])
  @@index([userId])
}

enum Role {
  PRODUCT
  DEV
  TEST
  UI
  EXTERNAL
}

model Session {
  id        String   @id @default(cuid())
  userId    String
  expiresAt DateTime
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())

  @@index([userId])
}

model Invite {
  id        String   @id @default(cuid())
  email     String
  roles     Role[]
  token     String   @unique
  invitedBy String
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime @default(now())

  @@index([token])
}

model Requirement {
  id        String   @id @default(cuid())
  title     String
  model     Json?    // Five-layer JSONB: { goals, assumptions, behaviors, scenarios, verifiability }
  status    String   @default("draft")
  createdBy String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### Anti-Patterns to Avoid
- **Auth check in layout only:** Layouts don't re-render on navigation. Always verify session in page components and Server Actions via the DAL, not just the layout.
- **Middleware for auth (deprecated pattern):** Next.js team no longer recommends middleware as the primary auth check. Use Proxy for optimistic redirects only; real auth happens in DAL.
- **Storing roles in session cookie:** Roles can change. Always fetch current roles from DB via the session lookup, not from cached cookie data.
- **Direct cross-module function calls:** All module communication must go through the event bus. No importing auth functions from the requirement module directly.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Password hashing | Custom hash function | bcrypt (10 rounds) | Timing attacks, salt management, cost factor tuning |
| Session encryption | Custom encryption | jose (HS256 JWT) | Cryptographic correctness, key rotation support |
| Form validation | Manual if/else chains | Zod schemas | Composable, reusable, integrates with tRPC and Server Actions |
| Database migrations | Raw SQL scripts | Prisma Migrate | Version tracking, rollback, type generation |
| UI primitives | Custom form inputs | shadcn/ui + Radix | Accessibility (ARIA, keyboard nav, focus management) |
| Event emitter | Custom pub/sub | EventEmitter3 | Memory leak prevention, performance optimization, battle-tested |

**Key insight:** Phase 1 is infrastructure — every hand-rolled solution here becomes technical debt that all future phases inherit. Use proven libraries for all foundational concerns.

## Common Pitfalls

### Pitfall 1: First-User Bootstrap Race Condition
**What goes wrong:** Two users register simultaneously before any admin exists; both become admin.
**Why it happens:** Check-then-act without transaction isolation.
**How to avoid:** Use a Prisma transaction with a serializable isolation level or an advisory lock when checking "is this the first user?" and creating the admin.
**Warning signs:** Multiple admin users in production with no audit trail of assignment.

### Pitfall 2: Session Not Invalidated on Role Change
**What goes wrong:** Admin removes a role from a user, but the user's existing session still has the old roles cached.
**Why it happens:** Roles read from session cache instead of DB on each request.
**How to avoid:** Always fetch roles from DB via session lookup (the DAL pattern above does this). Never cache roles in the cookie payload.
**Warning signs:** User can still access role-restricted features after role removal.

### Pitfall 3: Invite Token Predictability
**What goes wrong:** Invite tokens are guessable (sequential IDs, short random strings).
**Why it happens:** Using `Math.random()` or auto-increment IDs for tokens.
**How to avoid:** Use `crypto.randomBytes(32).toString('hex')` for invite tokens. Set expiration (48 hours recommended). Mark as used after registration.
**Warning signs:** Unauthorized registrations from non-invited users.

### Pitfall 4: EventEmitter Memory Leaks
**What goes wrong:** Listeners accumulate without cleanup, causing memory leaks.
**Why it happens:** Adding listeners in request handlers without removing them.
**How to avoid:** Event listeners should be registered at module initialization (server startup), not per-request. Use `eventBus.once()` for one-time reactions. EventEmitter3 does not have `setMaxListeners` — monitor listener count in development.
**Warning signs:** Increasing memory usage over time, duplicate event handling.

### Pitfall 5: Prisma Client Instantiation in Development
**What goes wrong:** Hot module reloading creates multiple Prisma Client instances, exhausting database connections.
**Why it happens:** Next.js dev server re-executes modules on each change.
**How to avoid:** Use the global singleton pattern:
```typescript
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }
export const prisma = globalForPrisma.prisma || new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```
**Warning signs:** "Too many database connections" errors in development.

## Code Examples

### Server Action: Login Flow
```typescript
// src/app/actions/auth.ts
'use server'
import { prisma } from '@/server/db/client'
import { compare } from 'bcrypt'
import { createSession } from '@/server/auth/session'
import { eventBus } from '@/server/events/bus'
import { redirect } from 'next/navigation'
import { z } from 'zod'

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function login(prevState: unknown, formData: FormData) {
  const parsed = LoginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) return { error: 'Invalid credentials' }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } })
  if (!user || !(await compare(parsed.data.password, user.password))) {
    return { error: 'Invalid credentials' }
  }

  await createSession(user.id)
  eventBus.emit('session.created', { sessionId: 'new', userId: user.id })
  redirect('/dashboard')
}
```

### Server Action: First-User Bootstrap Registration
```typescript
// src/app/actions/register.ts
'use server'
import { prisma } from '@/server/db/client'
import { hash } from 'bcrypt'
import { createSession } from '@/server/auth/session'
import { eventBus } from '@/server/events/bus'
import { redirect } from 'next/navigation'

export async function registerFirstUser(prevState: unknown, formData: FormData) {
  const userCount = await prisma.user.count()
  if (userCount > 0) return { error: 'Registration is invite-only' }

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const name = formData.get('name') as string

  const hashedPassword = await hash(password, 10)

  const user = await prisma.$transaction(async (tx) => {
    const count = await tx.user.count()
    if (count > 0) throw new Error('Race condition: user already exists')

    return tx.user.create({
      data: { email, password: hashedPassword, name, isAdmin: true },
    })
  })

  await createSession(user.id)
  eventBus.emit('user.registered', { userId: user.id, email: user.email })
  redirect('/dashboard')
}
```

### tRPC Router: Role Management
```typescript
// src/server/trpc/routers/user.ts
import { z } from 'zod'
import { createTRPCRouter, protectedProcedure } from '../init'
import { prisma } from '@/server/db/client'
import { eventBus } from '@/server/events/bus'
import { TRPCError } from '@trpc/server'

export const userRouter = createTRPCRouter({
  assignRole: protectedProcedure
    .input(z.object({ userId: z.string(), role: z.enum(['PRODUCT', 'DEV', 'TEST', 'UI', 'EXTERNAL']) }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.session.user.isAdmin) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      const userRole = await prisma.userRole.create({
        data: { userId: input.userId, role: input.role },
      })

      eventBus.emit('user.role.assigned', {
        userId: input.userId,
        role: input.role,
        assignedBy: ctx.session.userId,
      })

      return userRole
    }),
})
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Next.js Middleware for auth | Proxy file + DAL pattern | Next.js 15+ (2025) | Middleware is no longer recommended as primary auth. Use Proxy for optimistic redirects, DAL for secure checks. |
| `getServerSideProps` auth | Server Components + Server Actions | Next.js 13+ App Router | Auth logic lives in Server Actions and DAL, not in page-level data fetching functions |
| NextAuth.js | Auth.js v5 | 2024 | Rebranded with App Router support. But for simple email/password with custom sessions, rolling your own is simpler. |
| Prisma 5 | Prisma 6 | 2025 | Rust-free ORM option in preview, improved JSON field support, Prisma Config GA |
| `pages/api` routes | `app/api` route handlers | Next.js 13+ | File-based API routes in App Router use Web Request/Response API |

**Deprecated/outdated:**
- `getServerSideProps` / `getStaticProps`: Replaced by Server Components in App Router
- Next.js Middleware as auth gate: Official docs now recommend Proxy + DAL pattern
- `@next-auth/prisma-adapter`: Now `@auth/prisma-adapter` under Auth.js v5 branding

## Open Questions

1. **Email sending provider for invites and password reset**
   - What we know: Need to send invite links and password reset emails. Low volume (internal tool, 5-15 users).
   - What's unclear: Which provider to use. Options: Resend, Nodemailer with SMTP, AWS SES.
   - Recommendation: Use Resend (simple API, generous free tier, good DX) or Nodemailer with any SMTP provider. For Phase 1, a simple `console.log` of the link in development is acceptable — wire up real email sending as a follow-up task. Keep the email interface abstract so the provider can be swapped.

2. **Session expiration duration**
   - What we know: Server-side sessions in DB. Need an expiration policy.
   - Recommendation: 7-day session expiration with sliding window (extend on activity). Clean up expired sessions via a periodic job or on-read deletion.

3. **Invite link expiration**
   - What we know: Admin sends invite links with pre-assigned roles.
   - Recommendation: 48-hour expiration. Single-use (mark as used after registration). Admin can re-send if expired.

## Sources

### Primary (HIGH confidence)
- [Next.js Official Authentication Guide](https://nextjs.org/docs/app/guides/authentication) - Session management patterns, DAL, Proxy, Server Actions auth flow (verified 2026-02-27)
- [Prisma JSON Fields Documentation](https://www.prisma.io/docs/orm/prisma-client/special-fields-and-types/working-with-json-fields) - JSONB field definition, filtering, limitations
- [Prisma 6 Quickstart with PostgreSQL](https://www.prisma.io/docs/v6/prisma-orm/quickstart/postgresql) - Current Prisma 6 setup patterns
- [tRPC React Server Components Setup](https://trpc.io/docs/client/react/server-components) - Server caller, hydration helpers, prefetch pattern
- [EventEmitter3 npm](https://npmjs.org/eventemitter3) - API, TypeScript support confirmation

### Secondary (MEDIUM confidence)
- [Next.js Authentication Best Practices 2025](https://www.franciscomoretti.com/blog/modern-nextjs-authentication-best-practices) - Middleware no longer recommended for auth
- [Auth.js v5 with Next.js 15](https://noqta.tn/en/tutorials/nextjs-authjs-v5-authentication-guide-2026) - Confirmed Auth.js v5 is current, but we're using custom auth per user decision
- [Password hashing best practices](https://www.caduh.com/blog/password-storage-the-right-way) - bcrypt vs argon2 comparison, bcrypt sufficient for internal tools

### Tertiary (LOW confidence)
- Exact latest versions of all packages need `npm view <pkg> version` verification before development starts

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries are well-documented, production-proven, and verified against official docs
- Architecture: HIGH - Patterns directly from Next.js official guide and Prisma docs; event bus pattern is straightforward
- Pitfalls: HIGH - Bootstrap race condition, session invalidation, and Prisma singleton are well-known issues with documented solutions

**Research date:** 2026-02-28
**Valid until:** 2026-03-30 (stable technologies, 30-day validity)
