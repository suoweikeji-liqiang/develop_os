---
phase: 06-role-views-consensus
verified: 2026-03-01T14:00:00Z
status: passed
score: 12/12 must-haves verified
re_verification: false
human_verification:
  - test: "Visit a requirement detail page as a PRODUCT user"
    expected: "Tabs appear in order: 目标, 假设, 场景, 行为, 可验证性 (primaryTabs first). Blue pill badge shows '产品视角'."
    why_human: "Tab reordering is runtime behavior; cannot verify rendered tab order from static files."
  - test: "Visit as a multi-role user (e.g. PRODUCT + DEV)"
    expected: "Role selector dropdown appears instead of static badge; switching role reorders tabs correctly."
    why_human: "Dropdown interaction and tab reorder are visual/interactive behaviors."
  - test: "Transition a requirement to IN_REVIEW, then attempt to advance to CONSENSUS without any sign-offs"
    expected: "Server returns PRECONDITION_FAILED with message '缺少以下角色的签字确认: PRODUCT, DEV, TEST, UI'."
    why_human: "Requires live DB and session to execute tRPC mutation."
  - test: "Complete all four role sign-offs, then advance to CONSENSUS"
    expected: "Transition succeeds. ConsensusStatus grid shows 4 green checkmarks."
    why_human: "End-to-end consensus flow requires live session with 4 different role users."
  - test: "Update the model while status is IN_REVIEW (after some sign-offs exist)"
    expected: "All existing sign-offs are deleted; ConsensusStatus grid resets to 4 gray clocks."
    why_human: "Requires live DB state with existing ReviewSignoff rows."
---

# Phase 6: Role Views & Consensus Verification Report

**Phase Goal:** Each role sees a tailored view of the same requirement model, and all required roles must sign off before status advances.
**Verified:** 2026-03-01T14:00:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A ReviewSignoff record is created when a role signs off on an IN_REVIEW requirement | VERIFIED | `signoffRouter.submit` upserts `prisma.reviewSignoff` after validating status === 'IN_REVIEW' (signoff.ts:32-71) |
| 2 | Sign-off requires all checklist items checked; partial sign-off is rejected | VERIFIED | `unchecked.filter` check throws `BAD_REQUEST` when any item has `checked: false` (signoff.ts:45-51) |
| 3 | Sign-off is idempotent — same role signing twice upserts, not duplicates | VERIFIED | `prisma.reviewSignoff.upsert` with `requirementId_role` compound key (signoff.ts:54-72) |
| 4 | Updating the model while status is IN_REVIEW deletes all existing sign-offs | VERIFIED | `reqStatus.status === 'IN_REVIEW'` check calls `deleteMany` + emits `signoff.invalidated` (requirement.ts:123-131) |
| 5 | The CONSENSUS transition is blocked if any of PRODUCT, DEV, TEST, UI has not signed off | VERIFIED | `REQUIRED_ROLES.filter(r => !signedRoles.has(r))` throws `PRECONDITION_FAILED` (requirement.ts:169-182) |
| 6 | Sign-off events are emitted via the event bus | VERIFIED | `eventBus.emit('requirement.signoff.submitted', ...)` (signoff.ts:74-78); `eventBus.emit('requirement.signoff.invalidated', ...)` (requirement.ts:127-130) |
| 7 | Each role (PRODUCT, DEV, TEST, UI) sees a reordered view with role-relevant layers shown first | VERIFIED | `ROLE_VIEWS` config drives `[...primaryTabs, ...secondaryTabs]` tab order in `RoleViewTabs` (role-view-tabs.tsx:75-77) |
| 8 | User sees their applicable roles and can sign off for each separately | VERIFIED | `SignoffPanel` filters `userRoles` to `APPLICABLE_ROLES`, renders one `RoleSignoffSection` per role (signoff-panel.tsx:108-124) |
| 9 | Sign-off panel is only shown when status is IN_REVIEW | VERIFIED | `if (currentStatus !== 'IN_REVIEW') return null` (signoff-panel.tsx:106) |
| 10 | Checklist must be fully completed before submit button is enabled | VERIFIED | `disabled={!allChecked || loading}` where `allChecked = items.every(item => item.checked)` (signoff-panel.tsx:37, 94) |
| 11 | Consensus status display shows which roles have signed and which are pending | VERIFIED | `ConsensusStatus` renders 2x2 grid with `CheckCircle2` (green) or `Clock` (gray) per role (consensus-status.tsx:56-88) |
| 12 | Read-only sign-off history is shown when status is CONSENSUS or later | VERIFIED | `SHOW_STATUSES = new Set(['IN_REVIEW', 'CONSENSUS', 'IMPLEMENTING', 'DONE'])` — ConsensusStatus visible from IN_REVIEW onward (consensus-status.tsx:9, 42) |

**Score:** 12/12 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `prisma/schema.prisma` | ReviewSignoff model with `@@unique([requirementId, role])` | VERIFIED | Model present at lines 122-135; compound unique index confirmed |
| `prisma/migrations/20260301133650_add_review_signoff/migration.sql` | ReviewSignoff DDL applied | VERIFIED | `CREATE TABLE "ReviewSignoff"` + unique index present; migration file exists |
| `src/server/trpc/routers/signoff.ts` | signoffRouter with submit mutation and list query | VERIFIED | 93-line file; exports `signoffRouter` with both procedures |
| `src/server/trpc/router.ts` | signoff router registered as `appRouter.signoff` | VERIFIED | `signoff: signoffRouter` at line 15 |
| `src/server/events/types.ts` | `requirement.signoff.submitted` and `requirement.signoff.invalidated` in EventMap | VERIFIED | Both entries present at lines 16-17 |
| `src/server/trpc/routers/requirement.ts` | Consensus gate in transitionStatus + invalidation in updateModel | VERIFIED | Gate at lines 169-182; invalidation at lines 123-131; backward CONSENSUS->IN_REVIEW clear at lines 190-194 |
| `src/lib/roles/role-view-config.ts` | ROLE_VIEWS config map: Role -> { label, primaryTabs, secondaryTabs, emphasisFields } | VERIFIED | All 4 roles (PRODUCT, DEV, TEST, UI) with correct primaryTabs/secondaryTabs order |
| `src/lib/roles/role-checklist-config.ts` | ROLE_CHECKLISTS config map: Role -> ChecklistItem[] | VERIFIED | 4 Chinese-label items per role, all 4 roles present |
| `src/app/(dashboard)/requirements/[id]/role-view-tabs.tsx` | RoleViewTabs — role-aware tab reordering, badge/selector | VERIFIED | 179-line client component; role badge, multi-role dropdown, ROLE_VIEWS-driven tab order |
| `src/app/(dashboard)/requirements/[id]/review-checklist.tsx` | ReviewChecklist — checkbox list with disabled state | VERIFIED | 38-line component; native HTML checkboxes, disabled prop wired |
| `src/app/(dashboard)/requirements/[id]/signoff-panel.tsx` | SignoffPanel — per-role checklist + submit, IN_REVIEW only | VERIFIED | 129-line component; early return on non-IN_REVIEW; per-role RoleSignoffSection |
| `src/app/(dashboard)/requirements/[id]/consensus-status.tsx` | ConsensusStatus — read-only sign-off grid for all 4 roles | VERIFIED | 92-line component; tRPC GET query; 2x2 grid rendering |
| `src/app/(dashboard)/requirements/[id]/page.tsx` | Passes userRoles from verifySession() to RequirementDetailClient | VERIFIED | `const session = await verifySession()` at line 15; `userRoles={session.roles}` at line 45 |
| `src/app/(dashboard)/requirements/[id]/requirement-detail-client.tsx` | Renders RoleViewTabs, ConsensusStatus, SignoffPanel | VERIFIED | All three components imported and rendered at lines 5-7, 177-204 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `signoff.ts` | `prisma.reviewSignoff` | `upsert` with compound unique key | WIRED | `prisma.reviewSignoff.upsert({ where: { requirementId_role: ... } })` at line 54 |
| `requirement.ts` | `prisma.reviewSignoff` | `findMany` check before CONSENSUS transition | WIRED | `prisma.reviewSignoff.findMany({ where: { requirementId: input.id } })` at line 170 |
| `requirement-detail-client.tsx` | `role-view-tabs.tsx` | `userRoles` prop, config read from ROLE_VIEWS | WIRED | `<RoleViewTabs ... userRoles={userRoles} ...>` at line 177; ROLE_VIEWS consumed in component |
| `signoff-panel.tsx` | `/api/trpc/signoff.submit` | `fetch` POST with requirementId, role, checklist | WIRED | `fetch('/api/trpc/signoff.submit', { method: 'POST', body: JSON.stringify({ json: { requirementId, role, checklist: items } }) })` at lines 47-51 |
| `consensus-status.tsx` | `/api/trpc/signoff.list` | tRPC GET query with encoded input param | WIRED | `fetch('/api/trpc/signoff.list?input=${params}')` at line 32; response parsed and rendered |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| COL-01 | 06-02-PLAN.md | 产品/开发/测试/UI 各角色可查看同一需求模型的角色专属视图 | SATISFIED | `ROLE_VIEWS` config maps each role to reordered tab presentation; `RoleViewTabs` renders layers in role-specific order; integrated into requirement detail page |
| COL-02 | 06-01-PLAN.md, 06-02-PLAN.md | 各角色按职责签字确认，全部签字才能推进状态 | SATISFIED | `ReviewSignoff` model + `signoffRouter.submit` (data layer); `transitionStatus` consensus gate (enforcement); `SignoffPanel` + `ConsensusStatus` (UI layer) |

Both requirements marked `[x]` in REQUIREMENTS.md. No orphaned requirements — COL-01 and COL-02 are the only IDs mapped to Phase 6 in the traceability table.

### Anti-Patterns Found

No anti-patterns detected. Scan across all 11 phase-modified files found:
- Zero TODO/FIXME/HACK/PLACEHOLDER comments
- No empty implementations (`return null` in SignoffPanel is intentional conditional rendering, not a stub)
- No console.log-only implementations
- No static return values masking missing DB queries

### Human Verification Required

#### 1. Role-specific tab ordering in browser

**Test:** Log in as a user with only the PRODUCT role, navigate to any requirement detail page that has a fully generated model.
**Expected:** Tabs render in order 目标, 假设, 场景, 行为, 可验证性 (goal, assumption, scenario, behavior, verifiability). Blue pill badge displays "产品视角". Default tab is 目标.
**Why human:** Tab rendering order is a runtime DOM state; cannot verify from static files.

#### 2. Multi-role dropdown behavior

**Test:** Log in as a user with both PRODUCT and DEV roles. Navigate to a requirement detail page.
**Expected:** A dropdown (select element) appears instead of the static badge. Selecting "开发视角" reorders tabs to 行为, 场景, 可验证性, 目标, 假设 and sets active tab to 行为.
**Why human:** Dropdown interaction and reactive tab reorder require browser execution.

#### 3. Consensus gate blocking incomplete sign-off

**Test:** Transition a requirement to IN_REVIEW. Without any sign-offs, attempt to transition to CONSENSUS via the StatusControl UI.
**Expected:** Request fails. Error message displayed: "缺少以下角色的签字确认: PRODUCT, DEV, TEST, UI".
**Why human:** Requires live database session and tRPC mutation execution.

#### 4. Full four-role sign-off flow advancing to CONSENSUS

**Test:** As four different users (one per role), each completing their checklist and submitting sign-off for a requirement in IN_REVIEW. Then advance to CONSENSUS.
**Expected:** ConsensusStatus grid shows 4 green checkmarks with user names and dates. CONSENSUS transition succeeds.
**Why human:** Requires 4 live sessions with distinct role assignments.

#### 5. Model update invalidating sign-offs during IN_REVIEW

**Test:** Have two roles sign off, then update the requirement model via the LayerEditor while status is IN_REVIEW.
**Expected:** ConsensusStatus grid resets to 4 gray pending clocks; previously submitted sign-offs are erased.
**Why human:** Requires live DB state with existing ReviewSignoff rows that get deleted.

### Gaps Summary

No gaps. All 12 observable truths verified against actual codebase. All artifacts exist, are substantive (non-stub), and are correctly wired. Both requirement IDs (COL-01, COL-02) have full implementation evidence. The migration SQL confirms the ReviewSignoff table is deployed to the database.

Five items require human (browser/live DB) verification to confirm runtime behavior — these are standard UI interaction and end-to-end flow tests that cannot be verified from static code analysis.

---

_Verified: 2026-03-01T14:00:00Z_
_Verifier: Claude (gsd-verifier)_
