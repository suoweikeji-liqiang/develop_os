# Technology Stack

**Project:** DevOS — AI-Driven Requirements Clarification Platform
**Researched:** 2026-02-28
**Overall Confidence:** MEDIUM (versions from training data, not live-verified — run `npm view <pkg> version` to confirm)

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Next.js (App Router) | ^15.x | Full-stack web framework | Server Components for AI streaming, API routes for backend, built-in SSR/SSG. App Router is the stable default since v13.4+. Monorepo-friendly. The team is 5-15 people — a single deployable unit reduces operational overhead vs separate frontend/backend. | MEDIUM |
| TypeScript | ^5.x | Type safety | Non-negotiable for a platform where data models (requirement structures) are the core product. Shared types between client/server prevent the exact "misunderstanding" problem DevOS aims to solve. | HIGH |
| React | ^19.x | UI library | Comes with Next.js. React 19 Server Components enable streaming AI responses directly from server to client without WebSocket boilerplate. | MEDIUM |

### AI Integration

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Vercel AI SDK (`ai`) | ^4.x | LLM integration layer | Provider-agnostic (OpenAI, Anthropic, local models). Built-in streaming, tool calling, structured output (JSON schema). `streamText()` and `generateObject()` map directly to DevOS needs: streaming dialogue + structured requirement model generation. Tight Next.js integration. | MEDIUM |
| `@ai-sdk/openai` | ^1.x | OpenAI provider | Swap providers without changing application code. Start with GPT-4o for cost/quality balance, switch to Claude for longer context windows on large requirement docs. | MEDIUM |
| `zod` | ^3.x | Schema validation | Define requirement model schemas once, use for both AI structured output validation and API input validation. Vercel AI SDK uses Zod natively for `generateObject()`. | HIGH |

**Why NOT LangChain.js:** LangChain adds heavy abstraction for chain orchestration that DevOS doesn't need in v1. The Vercel AI SDK is lighter, has better TypeScript support, and integrates natively with Next.js streaming. LangChain is better suited when you need complex multi-step chains with memory — DevOS's agent architecture should be custom-built for extensibility rather than locked into LangChain's abstractions.

### Database

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| PostgreSQL | 16+ | Primary database | JSONB for flexible requirement model storage, full-text search for knowledge base, strong transaction support for versioned models. The requirement model is semi-structured (5-layer model with varying depth) — JSONB handles this without rigid migrations for every model evolution. | HIGH |
| Prisma | ^6.x | ORM / query builder | Type-safe database access, auto-generated types from schema, migrations. Prisma's JSON field support maps well to requirement model storage. | MEDIUM |
| pgvector extension | ^0.7+ | Vector embeddings | Semantic search over knowledge base documents and historical requirements. Keeps everything in one database instead of adding a separate vector DB. For 5-15 person team scale, pgvector is more than sufficient. | HIGH |

**Why NOT MongoDB:** The requirement model has relational aspects (users, teams, versions, comments linked to specific model nodes). PostgreSQL with JSONB gives document flexibility where needed while maintaining relational integrity where it matters. MongoDB would require manual join logic for the collaboration features.

**Why NOT a separate vector DB (Pinecone/Weaviate):** At 5-15 person team scale with document uploads and code repo indexing, pgvector handles the load easily. Adding a separate vector DB adds operational complexity with no benefit at this scale.

### Real-Time Collaboration

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Yjs | ^13.x | CRDT for conflict-free editing | Industry standard for real-time collaborative editing. Handles concurrent edits to requirement models without conflicts. Works offline. Battle-tested in production (used by Notion, JupyterLab). | HIGH |
| y-websocket | ^2.x | Yjs WebSocket transport | Standard Yjs network provider. Simple server that syncs Yjs documents between clients. | HIGH |
| Hocuspocus | ^2.x | Yjs WebSocket server | Production-ready Yjs server with auth hooks, persistence, webhooks. Saves implementing custom sync server. Built by Tiptap team. | MEDIUM |

**Why NOT Socket.io:** Socket.io is a general-purpose WebSocket library. For collaborative editing, you need CRDTs (conflict resolution), not just message passing. Yjs provides the data structure; Socket.io would only be the transport layer and you'd still need to build conflict resolution yourself.

**Why NOT Liveblocks:** Liveblocks is a hosted service. DevOS is an internal tool — self-hosted Yjs gives full control, no vendor lock-in, no per-user pricing that scales poorly.

### State Management

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Zustand | ^5.x | Client state management | Minimal API, TypeScript-first, works well with React Server Components. For a collaborative app, most state lives in Yjs documents (synced) or server (React Query cache). Zustand handles the remaining UI state (panel visibility, selection, local preferences). | MEDIUM |
| TanStack Query | ^5.x | Server state / cache | Handles API data fetching, caching, optimistic updates. Pairs with tRPC for end-to-end type safety. Manages the "server state" that isn't real-time collaborative (user profiles, project settings, knowledge base metadata). | HIGH |

**Why NOT Redux:** Overkill for this use case. Most "state" in DevOS is either collaborative (Yjs) or server-derived (TanStack Query). Redux's boilerplate adds no value when the remaining client state is minimal.

### API Layer

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| tRPC | ^11.x | Type-safe API | End-to-end TypeScript type safety without code generation. Define API on server, get full autocomplete on client. Eliminates API contract mismatches — fitting for a product about eliminating misunderstandings. | MEDIUM |
| Next.js API Routes | built-in | HTTP endpoints | For webhooks, file uploads, external integrations that don't fit tRPC's RPC model. | HIGH |

**Why NOT REST + OpenAPI:** tRPC gives the same type safety with zero code generation step. For an internal tool with a single frontend, tRPC's DX advantage is significant. REST makes sense for public APIs — DevOS doesn't need one in v1.

**Why NOT GraphQL:** GraphQL solves the problem of multiple clients needing different data shapes. DevOS has one client. GraphQL adds schema definition overhead, resolver boilerplate, and a build step for no benefit.

### UI Components

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Tailwind CSS | ^4.x | Styling | Utility-first CSS. Fast iteration for internal tools. No component library lock-in. | MEDIUM |
| shadcn/ui | latest | Component library | Copy-paste components (not npm dependency). Full control over code. Built on Radix UI primitives for accessibility. Tailwind-based. | HIGH |
| Radix UI | ^1.x | Accessible primitives | Underlying primitives for shadcn/ui. Handles keyboard navigation, ARIA, focus management. | HIGH |
| ReactFlow | ^12.x | State diagram visualization | For rendering behavior model state diagrams (Layer 3 of the 5-layer model). Interactive node-based graphs with zoom, pan, drag. | HIGH |
| Tiptap | ^2.x | Rich text editor | For requirement description editing. Built on ProseMirror, has native Yjs integration for real-time collaboration. Extensible with custom nodes (e.g., inline requirement references). | HIGH |

**Why NOT Ant Design / Material UI:** These are opinionated design systems. DevOS needs custom visualizations (state diagrams, diff views, 5-layer model UI) that don't fit pre-built component patterns. shadcn/ui gives building blocks without fighting a design system.

### Event System & Plugin Architecture

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| EventEmitter3 | ^5.x | In-process event bus | Lightweight typed event emitter for the plugin/agent system. Agents subscribe to events (requirement.created, model.updated) and react. Simple enough for v1, replaceable with a message queue later if needed. | HIGH |
| BullMQ | ^5.x | Job queue | For async AI tasks (document parsing, embedding generation, model auto-generation). Redis-backed. Handles retries, rate limiting, priority queues. | MEDIUM |
| Redis | ^7.x | Queue backend + cache | BullMQ backend. Also useful for Yjs document persistence, session cache, rate limiting. | HIGH |

**Why NOT Kafka/RabbitMQ:** Massive overkill for 5-15 users. BullMQ + Redis handles the async workload. If DevOS scales to enterprise, migrate to a proper message broker then.

### Knowledge Base / Document Processing

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| LangChain text splitters | ^0.3.x | Document chunking | Use ONLY the text splitting utilities from LangChain, not the full framework. Recursive character splitting with overlap for embedding preparation. | LOW |
| pdf-parse | ^1.x | PDF extraction | Extract text from uploaded PDF documents. | HIGH |
| tree-sitter (via WASM) | latest | Code parsing | Parse code repositories into AST for intelligent code indexing. Language-aware chunking for the knowledge base. | MEDIUM |

### Version Control (Requirement Models)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Custom (JSON diff) | — | Model versioning | Store requirement models as JSONB snapshots with `json-diff` for computing diffs. Git-like semantics (commit, branch, diff) but on JSON structures, not files. | HIGH |
| json-diff | ^1.x | Structural diff | Compute structural diffs between requirement model versions. Display what changed between versions in a human-readable way. | HIGH |

**Why NOT actual Git:** Git operates on files/text. Requirement models are structured JSON trees. Git diff on serialized JSON is unreadable. Custom JSON diffing gives semantic diffs ("added scenario X to behavior Y") instead of line-level text diffs.

### Testing

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Vitest | ^2.x | Unit/integration tests | Fast, Vite-native, ESM-first. Compatible with Jest API but faster. | MEDIUM |
| Playwright | ^1.x | E2E tests | Cross-browser E2E testing. Essential for testing real-time collaboration flows (multi-tab/multi-user scenarios). | HIGH |

### Infrastructure

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Docker Compose | v2 | Local dev + deployment | Single `docker compose up` for PostgreSQL, Redis, app. Internal tool for 5-15 people doesn't need Kubernetes. | HIGH |
| Nginx | latest | Reverse proxy | WebSocket proxying for Yjs, SSL termination, static file serving. | HIGH |

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Framework | Next.js | Remix | Remix has weaker streaming support for AI use cases; smaller ecosystem for AI tooling |
| Framework | Next.js | Separate Vite + Express | More operational overhead for a small team; lose Server Components streaming |
| AI SDK | Vercel AI SDK | LangChain.js | Too heavy for v1; abstractions don't match DevOS's custom agent architecture |
| Database | PostgreSQL + JSONB | MongoDB | Relational integrity needed for collaboration features; JSONB gives document flexibility |
| CRDT | Yjs | Automerge | Yjs has larger ecosystem, more transport options, better production track record |
| Editor | Tiptap | Slate.js | Tiptap has native Yjs integration; Slate requires manual CRDT binding |
| API | tRPC | GraphQL | Single client, no need for flexible queries; tRPC has less boilerplate |
| Queue | BullMQ | Kafka | 5-15 users; Kafka is enterprise-scale infrastructure overhead |
| Vector DB | pgvector | Pinecone | Same-database simplicity; sufficient at this scale |

## Installation

```bash
# Core framework
npm install next@latest react@latest react-dom@latest typescript@latest

# AI integration
npm install ai @ai-sdk/openai zod

# Database
npm install prisma @prisma/client
# PostgreSQL with pgvector extension installed separately

# Real-time collaboration
npm install yjs y-websocket @hocuspocus/server @hocuspocus/provider

# State management
npm install zustand @tanstack/react-query

# API
npm install @trpc/server @trpc/client @trpc/next @trpc/react-query

# UI
npm install tailwindcss @radix-ui/react-dialog @radix-ui/react-dropdown-menu
npm install reactflow @tiptap/react @tiptap/starter-kit @tiptap/extension-collaboration

# Event system & queue
npm install eventemitter3 bullmq ioredis

# Document processing
npm install pdf-parse json-diff

# Dev dependencies
npm install -D vitest @playwright/test @types/react @types/node eslint prettier
```

## Version Verification Note

Versions listed are based on training data (cutoff: early 2025). Before starting development, verify with:

```bash
npm view <package> version
```

Key packages to verify: `next`, `ai`, `yjs`, `@trpc/server`, `prisma`, `zustand`, `reactflow`, `bullmq`.

## Sources

- Training data (MEDIUM confidence — versions may have incremented)
- Next.js App Router: stable since v13.4, recommended default
- Vercel AI SDK: actively developed, streaming-first design
- Yjs: established CRDT library, used in production by multiple editors
- tRPC: v11 released 2024, stable
- pgvector: PostgreSQL extension, widely adopted for embedding search
