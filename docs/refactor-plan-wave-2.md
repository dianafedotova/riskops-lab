# RiskOps Lab — Refactor Plan (Wave 2)

## 1. Goal

Wave 2 is not about changing the canonical model again.

Wave 2 exists to make the refactored system:

* easier to expand
* safer to operate
* less likely to drift back into ad hoc patterns
* more compliant and auditable
* more consistent across staff console surfaces and trainee flows

Wave 2 should turn the Wave 1 architecture into a stable delivery platform.

---

## 2. Wave 2 Priorities

Wave 2 items are split into:

* **Mandatory** = required to keep the product scalable, predictable, and compliant
* **Nice to have** = valuable improvements, but not blockers for architectural correctness

---

## 3. Mandatory — Console Architecture

### Goal

Make staff-facing and admin-facing product surfaces consistent instead of page-specific.

### Must result in

* a shared architecture for admin / staff console pages
* consistent page composition across:

  * admin panel
  * alerts review surfaces
  * user review surfaces
  * future moderation / QA / oversight screens

* a predictable separation between:

  * route shell
  * permission gate
  * data orchestration
  * service calls
  * reusable domain components

### Required target state

Console pages should stop embedding workflow logic directly in large page components.

Each console page should follow a standard shape:

1. resolve current app actor
2. resolve permission capabilities
3. load data through service layer
4. render reusable domain blocks
5. trigger actions through shared mutation/service APIs

### Why mandatory

Without this, every new staff tool becomes a one-off implementation and the product will drift back into a Frankenstein console.

---

## 4. Mandatory — Reusable Domain Components

### Goal

Reduce repeated UI/domain composition patterns and prevent copy-paste growth.

### Must result in

* reusable domain-level components for recurring workflows
* less page-local custom logic for the same concepts
* shared rendering behavior across alerts, profiles, notes, and review flows

### Candidate domain components

* alert summary / alert identity block
* review workspace shell
* trainee decision panel
* assignment controls
* watchlist controls
* private notes panel
* trainee thread / QA thread panel
* permission-aware action toolbar

### Rules

Do not extract components only for visual reuse.

Extract when a UI block has stable domain meaning and stable permission semantics.

### Why mandatory

If domain widgets are not normalized, the product will keep expanding via copy-paste and visual divergence.

---

## 5. Mandatory — Developer Productivity Rails

### Goal

Make the correct architecture the easiest path for future work.

### Must result in

* shared patterns for data loading and mutations
* shared patterns for permission-gated rendering
* less need for developers to remember hidden rules manually
* lower chance of introducing architectural regressions during feature work

### Required guardrails

* pages/components must not implement workflow rules ad hoc
* new workflow logic must go through shared services/checks
* new permission decisions must use shared permission helpers/checks
* current app actor resolution must not be reimplemented in feature code
* new staff console screens must use the agreed console composition pattern

### Suggested enforcement

* lightweight code review checklist
* directory conventions that make service / permission ownership obvious
* file/module boundaries documented in the repo

### Why mandatory

A system can be technically correct today and still degrade quickly if the delivery path encourages ad hoc code.

---

## 6. Mandatory — Compliance Hardening

### Goal

Ensure the architecture is not only clean, but also auditable and safe under growth.

### Must result in

* explicit access paths for internal workflow data
* clearer traceability of staff actions
* reduced chance of accidental visibility leaks
* stronger alignment between service logic, frontend behavior, and RLS assumptions

### Required areas

#### 6.1 Permission test matrix

Create an explicit matrix for:

* `trainee`
* `reviewer`
* `ops_admin`
* `super_admin`

Per entity / action:

* can view
* can create
* can edit
* can reply
* can assign
* can unassign
* can see own-only data
* can see cross-user data
* can see org-scoped data

This must become executable tests where feasible, not just documentation.

#### 6.2 Auditability

Staff and privileged workflow actions must have a defined audit path.

At minimum, define whether and how the system records:

* assignment changes
* QA replies
* private note creation
* decision submission
* privileged visibility / moderation actions

#### 6.3 RLS / frontend contract verification

Wave 2 must verify that:

* service-layer expectations match actual RLS behavior
* no frontend flow depends on accidental over-broad visibility
* no compliance-sensitive access depends on UI-only checks

### Why mandatory

The product cannot be considered truly compliant if correctness depends on conventions rather than enforceable checks and auditability.

---

## 7. Mandatory — Legacy Compatibility Removal

### Goal

Remove transitional compatibility code introduced during refactor once the canonical path is proven stable.

### Must result in

* old role assumptions fully removed
* temporary adapters/fallbacks reviewed and deleted where no longer needed
* old schema guesses or compatibility probes removed when canonical schema is enforced
* fewer hidden branches that future code can accidentally depend on

### Why mandatory

If temporary compatibility code stays forever, it becomes the next layer of technical drift.

---

## 8. Nice To Have — UI Primitive Cleanup

### Goal

Improve visual consistency and reuse at the lower component layer.

### Examples

* normalize button variants
* normalize empty states / loading states / error banners
* normalize table wrappers
* normalize badges / pills / metadata rows
* reduce repetitive utility-class blocks

### Why nice to have

Helpful for speed and polish, but not the core blocker for architecture or compliance if domain-level reuse already exists.

---

## 9. Nice To Have — Page / Container Cleanup

### Goal

Reduce oversized page components after service/domain extraction is complete.

### Examples

* split pages into container + presentational sections
* reduce effect-heavy orchestration inside page files
* normalize loading and refresh patterns
* remove stale local state patterns

### Why nice to have

This improves maintainability, but should happen after role, permission, and service boundaries are stable.

---

## 10. Nice To Have — Lint / Hook Hygiene / Code Health Cleanup

### Goal

Reduce warning noise and improve day-to-day quality of life.

### Examples

* fix remaining lint warnings
* reduce avoidable `useEffect` state syncs
* remove dead variables/imports
* tighten hook dependency correctness
* replace ad hoc image usage where appropriate

### Why nice to have

Important for polish and engineering discipline, but secondary to access correctness and service-layer architecture.

---

## 11. Nice To Have — Type Hardening Beyond Wave 1

### Goal

Make incorrect entity mixing harder at compile time.

### Examples

* stronger type separation for app user vs simulator user
* explicit alert display ID vs alert internal ID typing
* branded ID types where practical
* normalized service return types

### Why nice to have

Very valuable, but can be phased in after service and permission architecture is stable.

---

## 12. Wave 2 Definition of Done

Wave 2 is done when the following **mandatory** outcomes are true:

* staff/admin console surfaces use a shared architecture instead of page-specific workflow logic
* recurring workflow UI is built from reusable domain components
* future feature work is guided by explicit productivity rails and architecture guardrails
* compliance-sensitive behavior is backed by permission matrices, RLS verification, and defined audit paths
* transitional legacy compatibility logic has been intentionally reviewed and removed where no longer needed

Wave 2 is stronger if the following **nice to have** outcomes are also true:

* low-level UI primitives are more consistent
* oversized pages are decomposed further
* lint/code-health warnings are reduced
* type-level protection against entity mixing is improved
