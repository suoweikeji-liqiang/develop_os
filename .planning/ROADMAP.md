# Roadmap: DevOS

## Overview

DevOS delivers an AI-driven requirements clarification platform in 10 phases. The journey starts with infrastructure and core AI structuring (the central hypothesis), layers on model management and collaboration workflows, adds external intake and knowledge base capabilities, and culminates with conflict detection and the agent plugin architecture that unlocks v2 extensibility. Each phase delivers a coherent, independently verifiable capability.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation** - User auth, role management, event bus, database schema, project scaffolding
- [x] **Phase 2: Core AI Structuring** - Natural language input transformed into five-layer structured model with schema validation
- [ ] **Phase 3: Conversational Refinement** - Dialogue-based model correction and AI assumption surfacing with confidence scores
- [ ] **Phase 4: Model Versioning** - Immutable version snapshots and structured diff views for requirement models
- [ ] **Phase 5: Workflow & Search** - Requirement status flow (draft to done) and full-text search with filtering
- [ ] **Phase 6: Role Views & Consensus** - Role-specific requirement views and multi-role sign-off workflow
- [ ] **Phase 7: Communication** - Comments, @mentions, async discussion, in-app and external notifications
- [ ] **Phase 8: External Intake** - Public submission form for outside departments and progress tracking
- [ ] **Phase 9: Knowledge Base** - Document upload, code repo integration, and historical context accumulation
- [ ] **Phase 10: Conflict Detection & Agent Architecture** - Cross-requirement contradiction detection and formalized agent plugin interface

## Phase Details

### Phase 1: Foundation
**Goal**: Users can authenticate, the system has role-based access, and the technical backbone (event bus, database, project structure) is operational
**Depends on**: Nothing (first phase)
**Requirements**: INF-01, INF-02
**Success Criteria** (what must be TRUE):
  1. User can register, log in, and log out of the application
  2. Admin can assign roles (product/dev/test/UI/external) to users
  3. Modules communicate through the event bus without direct coupling
  4. Database schema is deployed and accepts requirement model data
**Plans**: 4 plans

Plans:
- [x] 01-01: Project scaffolding and database setup
- [ ] 01-02: Authentication and role management
- [x] 01-03: Event bus infrastructure

### Phase 2: Core AI Structuring
**Goal**: Users can input fuzzy natural language requirements and receive a structured five-layer model (goal/assumption/behavior/scenario/verifiability)
**Depends on**: Phase 1
**Requirements**: AI-01, AI-05
**Success Criteria** (what must be TRUE):
  1. User can paste natural language text (Chinese or English) and receive a structured five-layer model
  2. AI output conforms to the defined schema; malformed output is automatically retried without user intervention
  3. User can view each layer of the generated model separately
  4. Generated model is persisted and retrievable after page refresh
**Plans**: 3 plans

Plans:
- [x] 02-01-PLAN.md — Five-layer model Zod schema, Prisma migration, event types, tRPC CRUD router
- [x] 02-02-PLAN.md — AI SDK 6 install, structuring engine with retry loop, streaming API route
- [x] 02-03-PLAN.md — Requirement input page, tab-based model display, inline editing, auto-save

### Phase 3: Conversational Refinement
**Goal**: Users can refine AI-generated models through dialogue, and the AI proactively surfaces hidden assumptions with confidence scores
**Depends on**: Phase 2
**Requirements**: AI-02, AI-03
**Success Criteria** (what must be TRUE):
  1. User can send follow-up messages to correct or refine any layer of the generated model
  2. AI applies user corrections and produces an updated model reflecting the feedback
  3. AI automatically identifies and displays implicit assumptions with confidence scores (high/medium/low)
  4. User can accept, reject, or modify each surfaced assumption
**Plans**: TBD

Plans:
- [ ] 03-01: Conversational refinement engine and chat UI
- [ ] 03-02: Assumption surfacing with confidence scoring
- [ ] 03-03: Model update pipeline (conversation -> model mutation)

### Phase 4: Model Versioning
**Goal**: Every requirement model change is tracked as an immutable snapshot, and users can compare any two versions with structured diffs
**Depends on**: Phase 2
**Requirements**: MOD-01, MOD-02
**Success Criteria** (what must be TRUE):
  1. Every model change creates a new immutable version snapshot
  2. User can browse the version history of any requirement model
  3. User can select two versions and see a structured diff (goal/scenario/state-level changes, not text-level)
  4. Previous versions are read-only and cannot be modified
**Plans**: TBD

Plans:
- [ ] 04-01: Version snapshot creation and storage
- [ ] 04-02: Structured diff computation and display

### Phase 5: Workflow & Search
**Goal**: Requirements follow a defined lifecycle (draft through completion) and users can find any requirement through search and filters
**Depends on**: Phase 4
**Requirements**: MOD-03, MOD-04
**Success Criteria** (what must be TRUE):
  1. Requirement status transitions through: draft -> in review -> consensus reached -> implementing -> done
  2. Invalid status transitions are blocked by the system
  3. User can search requirements by full-text query and find matching results
  4. User can filter requirements by status, tag, role, and date
**Plans**: TBD

Plans:
- [ ] 05-01: Status state machine and transition rules
- [ ] 05-02: Full-text search and filtering UI

### Phase 6: Role Views & Consensus
**Goal**: Each role sees a tailored view of the same requirement model, and all required roles must sign off before status advances
**Depends on**: Phase 5
**Requirements**: COL-01, COL-02
**Success Criteria** (what must be TRUE):
  1. Product/dev/test/UI roles each see a role-specific view of the same requirement model
  2. Each role has a role-appropriate review checklist
  3. Status cannot advance past "in review" until all required roles have signed off
  4. User can see which roles have signed off and which are pending
**Plans**: TBD

Plans:
- [ ] 06-01: Role-specific requirement views
- [ ] 06-02: Consensus sign-off workflow

### Phase 7: Communication
**Goal**: Team members can discuss requirements asynchronously and receive timely notifications about relevant changes
**Depends on**: Phase 6
**Requirements**: COL-03, COL-04
**Success Criteria** (what must be TRUE):
  1. User can add comments on any requirement model
  2. User can @mention other team members in comments
  3. Mentioned users receive in-app notifications
  4. Users receive email or webhook notifications for status changes and mentions
**Plans**: TBD

Plans:
- [ ] 07-01: Comments and @mention system
- [ ] 07-02: Notification engine (in-app + email/webhook)

### Phase 8: External Intake
**Goal**: External departments can submit requirements without full system access and track their processing status
**Depends on**: Phase 5
**Requirements**: EXT-01, EXT-02
**Success Criteria** (what must be TRUE):
  1. External user can access a simple submission form without full login
  2. External user can submit a requirement with enough context for the team to process it
  3. External user can check the processing status of their submitted requirement
**Plans**: TBD

Plans:
- [ ] 08-01: Public submission form
- [ ] 08-02: Submission status tracking page

### Phase 9: Knowledge Base
**Goal**: AI structuring leverages uploaded documents, connected code repos, and accumulated historical context to produce better models
**Depends on**: Phase 3
**Requirements**: KB-01, KB-02, KB-03
**Success Criteria** (what must be TRUE):
  1. User can upload background documents that the AI references during structuring
  2. User can connect a code repository and the AI understands existing system structure
  3. AI citations show which documents or code informed its suggestions
  4. Historical clarification sessions and decisions are automatically retained and influence future AI suggestions
**Plans**: TBD

Plans:
- [ ] 09-01: Document upload and embedding pipeline
- [ ] 09-02: Code repository integration
- [ ] 09-03: Historical context accumulation and RAG retrieval

### Phase 10: Conflict Detection & Agent Architecture
**Goal**: AI detects contradictions across requirements and between assumptions and behaviors; the agent plugin interface is formalized for future extensibility
**Depends on**: Phase 3, Phase 9
**Requirements**: AI-04, INF-03
**Success Criteria** (what must be TRUE):
  1. AI flags contradictions between different requirements
  2. AI flags inconsistencies between assumptions and behaviors within a requirement
  3. User can review, dismiss, or act on each detected conflict
  4. Agent plugin interface is documented and a second agent (conflict detector) runs through it
**Plans**: TBD

Plans:
- [ ] 10-01: Cross-requirement conflict detection engine
- [ ] 10-02: Agent plugin interface extraction and formalization

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8 -> 9 -> 10

Note: Phases 4 and 8 have independent dependency chains and may execute in parallel where practical.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 2/3 | In progress | - |
| 2. Core AI Structuring | 3/3 | Complete | 2026-02-28 |
| 3. Conversational Refinement | 0/3 | Not started | - |
| 4. Model Versioning | 0/2 | Not started | - |
| 5. Workflow & Search | 0/2 | Not started | - |
| 6. Role Views & Consensus | 0/2 | Not started | - |
| 7. Communication | 0/2 | Not started | - |
| 8. External Intake | 0/2 | Not started | - |
| 9. Knowledge Base | 0/3 | Not started | - |
| 10. Conflict Detection & Agent Architecture | 0/2 | Not started | - |
