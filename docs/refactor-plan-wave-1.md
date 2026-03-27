# RiskOps Lab — Refactor Plan (Wave 1)

## 1. Goal

The goal of this refactor is not to rewrite the whole project from scratch.

The goal is to:

* align implementation with `canonical.md`
* remove role drift and type drift
* centralize permission logic
* move domain logic out of UI components and ad hoc hooks
* make access behavior predictable across `super_admin`, `ops_admin`, `reviewer`, and `trainee`
* reduce chaos without a big-bang rewrite

---

## 2. Global Rules

### 2.1 No big-bang rewrite

Refactor only slice-by-slice.

Each task must have a limited scope and a minimal diff.

---

### 2.2 Canonical model wins

If existing code conflicts with `canonical.md`, refactor the code to match `canonical.md`.

Do not reinterpret the model ad hoc.

---

### 2.3 Do not change business meaning during refactor

Do not invent new role behavior, new access rules, or new entity semantics unless explicitly requested.

---

### 2.4 Never use legacy role assumptions

Deprecated role names such as `admin` and `user` must not be used in new code.

Canonical roles are:

* `super_admin`
* `ops_admin`
* `reviewer`
* `trainee`

---

## 3. Hard Technical Rules

### 3.1 Current app user resolution

Always resolve the current actor via:

```ts
public.app_users.auth_user_id = auth.uid()
```

Never use:

```ts
app_users.id = auth.uid()
```

---

### 3.2 Role source of truth

The only source of truth for role / organization / active state is:

```ts
public.app_users
```

Permissions must never be derived from:

* `auth.users`
* `public.users`
* frontend-only assumptions

---

### 3.3 No scattered inline role checks

Do not spread checks like these across the codebase:

```ts
role === "admin"
role === "user"
role === "ops_admin"
role === "super_admin"
```

Use shared helpers instead.

---

### 3.4 Never mix entity layers

Do not mix:

* auth user
* app user
* simulator user
* workflow artifacts
* internal metadata

---

### 3.5 Never silently mix domain entities

Do not silently merge or blur:

* `simulator_comments`
* `admin_private_notes`
* `internal_notes`

If UI shows them together, that must be an explicit orchestration decision.

---

## 4. Permission Model to Implement

### 4.1 Role hierarchy

```text
super_admin >= staff > trainee
```

Where:

```text
staff = reviewer + ops_admin
```

Important rules:

* `reviewer` and `ops_admin` are different roles but the same permission level
* they must not be treated as hierarchical roles
* `super_admin` must inherit all staff capabilities
* `super_admin` may have additional privileged features

---

### 4.2 Canonical role helpers

Use these derived flags:

* `isSuperAdmin`
* `isOpsAdmin`
* `isReviewer`
* `isTrainee`
* `isBaseStaff`
* `canAccessStaffFeatures`

Do not use legacy helpers such as:

* `isAdminLike`
* `isStaffLike`

---

### 4.3 Access decision model

Every access decision must be based on:

* role
* ownership
* organization context

Resolution order:

1. resolve current app user
2. read `role`, `organization_id`, `is_active`
3. compute permission flags
4. apply entity-specific access rules

---

## 5. Target Shared Modules

The exact file list may vary, but the target layering should look like this.

### 5.1 `lib/auth/current-app-user.ts`

Should contain:

* `getCurrentAppUser()`
* `requireCurrentAppUser()`
* normalized current app user context

This module must be the single place that resolves current app actor identity.

---

### 5.2 `lib/permissions/roles.ts`

Should contain:

* canonical role type
* role helper functions
* derived flags
* `canAccessStaffFeatures()`
* `isBaseStaffRole()`

This module must encode the canonical role model only.

---

### 5.3 `lib/permissions/checks.ts`

Should contain reusable permission checks, for example:

* `canSeeAdminPanel`
* `canViewPrivateNotes`
* `canViewInternalNotes`
* `canReplyAsQA`
* `canManageAssignments`
* `canManageWatchlist`
* `canViewTraineeDecision`
* `canViewAssignment`
* `canViewWatchlist`

Checks must be ownership-aware and org-aware where needed.

---

### 5.4 `lib/services/comments.ts`

Should contain:

* list comments
* add trainee comment
* add QA reply
* list private notes
* add private note
* explicit feed mapping if UI combines multiple sources

This layer must separate:

* simulator discussion
* staff private notes
* note/thread orchestration

---

### 5.5 `lib/services/review-threads.ts`

Should contain:

* get/create review thread
* resolve thread context
* alert/profile thread queries
* central handling of thread lookup rules

---

### 5.6 `lib/services/assignments.ts`

Should contain:

* read assignment state
* assign / unassign actions
* permission-aware reads
* trainee visibility logic

---

### 5.7 `lib/services/watchlist.ts`

Should contain:

* get current trainee watchlist
* add/remove watchlist item
* ownership rules
* visibility rules

---

### 5.8 `lib/services/decisions.ts`

Should contain:

* create decision
* read decision(s)
* review-state helpers
* permission-aware reads

---

## 6. Entity Rules That Must Be Preserved

### 6.1 Simulator data

Simulator data includes:

* `users`
* `alerts`
* `transactions`
* `user_events`
* `user_payment_methods`

This is case data, not app actor data.

---

### 6.2 Internal workflow data

Internal workflow data includes:

* `review_threads`
* `simulator_comments`
* `admin_private_notes`
* `trainee_decisions`
* `trainee_alert_assignments`
* `trainee_user_watchlist`
* `internal_notes`
* `ops_events`
* `app_user_activity`

This is not plain case data. It is workflow metadata and process context.

---

### 6.3 Private notes

`admin_private_notes` are hidden staff notes.

Visibility rules:

* `reviewer` can see only their own private notes
* `ops_admin` can see only their own private notes
* `super_admin` can see all private notes
* `trainee` cannot create or view private notes

These notes are not trainee-visible and are not part of trainee discussion.

---

### 6.4 Internal notes

`internal_notes` are predefined immutable educational notes.

They are not the same thing as private staff notes.

They are part of the training scenario and must be modeled separately from `admin_private_notes`.

---

### 6.5 Trainee notes / threads

Trainee-created note threads or note-related discussion may be visible to:

* the same trainee
* `reviewer` / `ops_admin` according to org rules
* `super_admin`

This visibility must be implemented intentionally, not by accidental query overlap.

---

### 6.6 Assignments

Alerts are unassigned by default.

Assignments may be created by:

* `reviewer`
* `ops_admin`
* `super_admin`

Visibility rules:

* assigned trainee can see their own assignment
* other trainees cannot see that assignment
* staff may access assignment context according to workflow rules
* `super_admin` can access assignment context globally

Assignment is workflow metadata, not simulator case data.

---

### 6.7 Watchlist

A trainee can only see their own watchlist.

Other trainees’ watchlist entries must never be visible.

Staff visibility must follow explicit business rules, not accidental query reuse.

---

### 6.8 Alert identity model

In `public.alerts`:

* `id` is the canonical UI/display alert identifier
* `internal_id` is the canonical technical UUID for joins, note relations, thread context, and internal references

Rules:

* UI-facing display may use `alerts.id`
* technical relations must use `alerts.internal_id` where alert technical identity is required
* do not mix `id` and `internal_id` arbitrarily
* relation strategy must be documented in service layer and types

This ambiguity must be normalized during refactor.

---

### 6.9 Backup tables

Backup tables are not part of the application model.

They must not be used by:

* frontend code
* business logic
* new services
* new refactor work

---

## 7. Refactor Order

## Slice 1. Auth + current app user

### Goal

Unify current actor resolution.

### Must result in

* one canonical path from session → `auth.uid()` → `app_users.auth_user_id`
* one normalized current app user object
* no mixed usage of `app_users.id` vs `auth.uid()`
* centralized handling of inactive / missing app users

### Expected behavior

* current app user is resolved consistently
* role resolves consistently
* organization resolves consistently
* inactive users are blocked consistently

---

## Slice 2. Role model + permission helpers

### Goal

Align frontend role handling with canonical role model.

### Must result in

* no legacy `admin` / `user` assumptions
* role unions match DB reality
* centralized role helper layer exists
* `super_admin` inherits staff features correctly
* no more `isAdminLike` / `isStaffLike`

### Expected behavior

* `super_admin`, `ops_admin`, `reviewer`, `trainee` are handled consistently
* staff capability checks work identically across routes and components
* permission logic becomes reusable instead of ad hoc

---

## Slice 3. Route guards / menu / protected visibility

### Goal

Remove scattered permission branching from pages, nav, and guards.

### Must result in

* protected routes use shared checks
* menu visibility uses shared checks
* admin/staff/trainee visibility is predictable
* no duplicated permission branching in multiple places

### Expected behavior

* `super_admin` sees everything they should
* `ops_admin` does not lose features
* `reviewer` does not gain unrelated control
* `trainee` does not see чужой internal context

---

## Slice 4. Alert context normalization

### Goal

Normalize alert identity usage and thread context resolution.

### Must result in

* explicit rule for when to use `alerts.id`
* explicit rule for when to use `alerts.internal_id`
* service layer hides ambiguity from UI
* thread / note / decision relations use the correct alert identity consistently

### Expected behavior

* alert page opens reliably
* review thread resolves correctly
* notes / decisions / comments attach to the correct alert context
* no accidental mixing of display ID and technical UUID

---

## Slice 5. Comments / private notes / internal notes / review thread

### Goal

Separate review discussion, staff hints, and educational notes.

### Must result in

* explicit distinction between:

  * `simulator_comments`
  * `admin_private_notes`
  * `internal_notes`
* UI no longer owns the core domain logic
* mapping layer exists if UI combines sources
* private note visibility follows the confirmed policy

### Expected behavior

* trainee discussion works
* QA replies work
* private notes remain private
* internal notes remain predefined and non-editable
* thread behavior is predictable

---

## Slice 6. Assignment / watchlist / trainee flow

### Goal

Move ownership-driven logic out of UI and into shared services / checks.

### Must result in

* assignment visibility is centralized
* watchlist visibility is centralized
* trainee ownership rules are enforced in one place
* UI only renders the resulting state

### Expected behavior

* a trainee sees only their own assignment
* a trainee sees only their own watchlist
* staff assignment and review flows remain functional
* no accidental leakage between trainees

---

## Slice 7. Types cleanup

### Goal

Align TypeScript types with actual schema and canonical model.

### Must result in

* role types match DB
* alert identity types reflect `id` vs `internal_id`
* app user vs simulator user types are clearly separated
* comments / notes / decisions types reflect actual semantics

### Expected behavior

* less defensive chaos in components
* fewer wrong assumptions in hooks
* less type drift after future changes

---

## 8. What Must Be Checked After Every Slice

### 8.1 Auth bootstrap

Check that:

* current app user resolves correctly
* role resolves correctly
* organization resolves correctly
* inactive users are handled correctly

### 8.2 UI visibility

Check that:

* `super_admin` sees everything they should
* `ops_admin` keeps staff features
* `reviewer` gets only intended scope
* `trainee` does not see foreign internal context

### 8.3 RLS compatibility

Check that:

* frontend queries do not contradict policy
* app user lookup uses `auth_user_id`
* UI assumptions do not bypass or contradict database rules

### 8.4 Regression on review flows

Check that:

* thread opens
* comments load
* replies send
* decisions load
* assignments behave correctly
* private notes still follow business rules

---

## 9. What Must NOT Be Done During Refactor

Do not:

* rewrite the whole app in one shot
* change role semantics mid-refactor
* silently merge entities with different meanings
* change RLS just because frontend is inconvenient
* add new scattered inline permission checks
* move even more business logic into React hooks
* use backup tables in app code

---

## 10. Definition of Done for Wave 1

Wave 1 is done when:

* current app user is resolved in one canonical way
* frontend role model matches DB role model
* no legacy role checks remain
* shared permission helpers exist and are actually used
* route / menu / major visibility logic uses shared checks
* comments / private notes / internal notes follow explicit semantics
* assignment and watchlist visibility no longer leaks across trainees
* alert context uses documented identity rules
* no permissions are derived from `public.users`
* frontend behavior is consistent with canonical architecture
