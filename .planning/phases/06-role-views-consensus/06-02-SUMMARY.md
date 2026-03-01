---
phase: 06-role-views-consensus
plan: "02"
subsystem: role-views-ui
tags: [role-views, signoff, consensus, ui, trpc]
dependency_graph:
  requires: [ReviewSignoff-model, signoffRouter, consensus-gate]
  provides: [RoleViewTabs, SignoffPanel, ConsensusStatus, role-view-config, role-checklist-config]
  affects: [requirement-detail-client, page]
tech_stack:
  added: []
  patterns: [role-based-tab-reordering, per-role-checklist, consensus-grid-display]
key_files:
  created:
    - src/lib/roles/role-view-config.ts
    - src/lib/roles/role-checklist-config.ts
    - src/app/(dashboard)/requirements/[id]/role-view-tabs.tsx
    - src/app/(dashboard)/requirements/[id]/review-checklist.tsx
    - src/app/(dashboard)/requirements/[id]/signoff-panel.tsx
    - src/app/(dashboard)/requirements/[id]/consensus-status.tsx
  modified:
    - src/app/(dashboard)/requirements/[id]/page.tsx
    - src/app/(dashboard)/requirements/[id]/requirement-detail-client.tsx
decisions:
  - "RoleViewTabs wraps LayerEditor/AssumptionCard reusing existing rendering — does not duplicate layer display logic"
  - "ModelTabs retained for generate mode (streaming); RoleViewTabs used for view mode after model exists"
  - "Native HTML checkbox used instead of Radix Checkbox — package not installed and not needed for this use case"
  - "ConsensusStatus uses tRPC GET query pattern with encoded input param for signoff.list query"
  - "SignoffPanel per-role sections use local useState for checklist state, isolated per role"
metrics:
  duration: "9min"
  completed_date: "2026-03-01"
  tasks_completed: 2
  files_changed: 8
---

# Phase 6 Plan 02: Role Views UI and Sign-off Components Summary

**One-liner:** Role-specific tab reordering with PRODUCT/DEV/TEST/UI perspectives, per-role sign-off checklist panel, and four-role consensus status grid wired into the requirement detail page.

## What Was Built

1. **ROLE_VIEWS config map** (`src/lib/roles/role-view-config.ts`) — Maps each of the four reviewer roles to a label, ordered primaryTabs/secondaryTabs (reordering the five-layer model), and emphasisFields. PRODUCT leads with goal/assumption/scenario; DEV with behavior/scenario/verifiability; TEST with verifiability/scenario/behavior; UI with goal/behavior/scenario.

2. **ROLE_CHECKLISTS config map** (`src/lib/roles/role-checklist-config.ts`) — Maps each role to four Chinese-language checklist items that must all be checked before signing off.

3. **RoleViewTabs component** — Client component that renders the five-layer model tabs reordered per the user's role config. Shows a role label badge (blue pill) for single-role users, or a role selector dropdown for multi-role users. Integrates with existing LayerEditor and AssumptionCard — no duplication of rendering logic. Falls back to default tab order for users with no PRODUCT/DEV/TEST/UI role.

4. **ReviewChecklist component** — Simple checklist with native HTML checkboxes styled consistently, supports disabled state for read-only display.

5. **SignoffPanel component** — Visible only in IN_REVIEW status. Shows a collapsible section per applicable role with its checklist. Submit button disabled until all items checked. On successful submission marks the section as "已签字确认". Filters out EXTERNAL/non-reviewer roles.

6. **ConsensusStatus component** — Shows a 2x2 grid of the four required roles with green checkmark + user name + date for signed roles, gray clock for pending roles. Visible from IN_REVIEW through DONE. Fetches via tRPC GET query.

7. **page.tsx wired** — Captures `verifySession()` return value and passes `session.roles` as `userRoles` to RequirementDetailClient.

8. **RequirementDetailClient updated** — Added `userRoles: string[]` prop. Uses RoleViewTabs when model exists (view mode), retains ModelTabs for generate mode (streaming). ConsensusStatus and SignoffPanel rendered below the tabs.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | e03dce9 | Role config maps and RoleViewTabs component |
| Task 2 | 7797b67 | SignoffPanel, ConsensusStatus, and page wiring |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing dependency] Radix Checkbox not installed**
- **Found during:** Task 2 Step 1
- **Issue:** `@radix-ui/react-checkbox` not in package.json — plan specified using it for ReviewChecklist
- **Fix:** Used native HTML `<input type="checkbox">` with Tailwind styling — functionally equivalent, no extra dependency needed
- **Files modified:** src/app/(dashboard)/requirements/[id]/review-checklist.tsx
- **Commit:** 7797b67

## Success Criteria Verification

- [x] ROLE_VIEWS exported from src/lib/roles/role-view-config.ts with correct primaryTabs/secondaryTabs per role
- [x] ROLE_CHECKLISTS exported from src/lib/roles/role-checklist-config.ts with Chinese labels
- [x] RoleViewTabs renders layers reordered by role config, shows role label badge
- [x] SignoffPanel shows per-role checklists only in IN_REVIEW, enables submit only when all items checked
- [x] ConsensusStatus shows sign-off grid for all 4 required roles with signed/pending state
- [x] page.tsx passes session.roles to RequirementDetailClient as userRoles
- [x] requirement-detail-client.tsx renders all three new components
- [x] TypeScript compiles: `npx tsc --noEmit` exits 0
- [x] Build succeeds: `npm run build` completes cleanly

## Self-Check: PASSED
