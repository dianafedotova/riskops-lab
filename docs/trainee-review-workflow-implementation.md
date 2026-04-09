# RiskOps Lab — Trainee Review Workflow Implementation

## 1. Purpose

This document defines the target implementation for trainee review workflow across:

* database schema
* domain model
* permission behavior
* reviewer role review flow
* trainee flow
* UI placement on profile / alert / review screens
* future monetization and AI review support

This design intentionally separates:

* **reference notes**
* **reviewer-only internal notes**
* **trainee review work**

It also treats **one review thread as one paid review session** in the future.

This document is an implementation spec only.

Canonical rules for:

* role model
* permission model
* entity separation

remain defined by `docs/canonical.md`.

---

## 2. Product Goals

The workflow must support all of the following:

* trainee can work in a thread for a specific alert or simulator user profile
* trainee can submit work for review even if no final decision is selected
* reviewer / ops_admin / super_admin can open a specific thread in the review UI and review the exact trainee submission
* reviewer / ops_admin / super_admin can see the trainee decision snapshot and alert/user status snapshot at the moment of submission
* reviewer / ops_admin / super_admin can leave feedback and evaluate the work
* trainee can revise and resubmit **inside the same paid review thread**
* predefined notes remain separate from review workflow
* private reviewer notes remain separate from trainee-visible workflow
* future AI review can replace or augment human review without changing the core architecture

---

## 3. Core Design Decisions

### 3.1 Thread is the review container

`review_threads` remains the main container.

Meaning:

* one alert/profile review workspace
* one paid review session in future monetized flows
* one conversation timeline
* multiple submission iterations allowed inside the same thread

### 3.2 Submission is a frozen review iteration

The system must not review a moving target.

When trainee presses `Submit for review`, the system creates a **submission snapshot** inside the thread.

That submission captures:

* what trainee wrote
* whether trainee selected a decision or not
* what statuses were visible at the moment of submission
* when it was submitted

### 3.3 Evaluation is separate from process state

Do not overload one field with both workflow state and quality assessment.

Use:

* `review_state` = where the submission is in the process
* `evaluation` = how good the reviewed work was

Recommended `evaluation` values:

* `needs_work`
* `developing`
* `solid`
* `excellent`

### 3.4 Internal notes and trainee review are different concepts

Keep them separate.

* `Predefined Notes` = reference/training context
* `Admin Private Notes` = private reviewer context for `reviewer`, `ops_admin`, `super_admin`
* `Trainee Review Workflow` = trainee comments, submission, feedback, evaluation

### 3.5 Canonical actor and permission model

This workflow must follow `docs/canonical.md`.

Meaning:

* `public.app_users` is the only source of truth for actor identity, role, organization context, and permission checks
* `public.users` represents simulator users only
* frontend visibility alone must never be treated as authorization

For this workflow specifically:

* `app_user_id` = the real authenticated system actor, for example trainee, reviewer, ops_admin, or super_admin
* `organization_id` = the organization context used by canonical access rules
* `user_id` = the simulator user being reviewed
* `user_id` must never be treated as actor identity
* `user_id` must never be used as the source of permission decisions

---

## 4. Target Domain Model

### 4.1 Existing entities to keep

Keep:

* `review_threads`
* `simulator_comments`
* `trainee_decisions`

### 4.2 New entity to add

Add a new table:

* `review_submissions`

This table becomes the canonical record of what was submitted for review.
It belongs to the internal workflow domain and does not change the canonical domain separation.

### 4.3 Entity responsibilities

#### `review_threads`

Purpose:

* review session container
* alert/profile scope
* billing / routing anchor later

#### `simulator_comments`

Purpose:

* timeline / conversation inside thread
* trainee draft notes
* trainee review-visible notes
* reviewer QA / review replies

Do **not** use this table as the canonical source of submission state.

#### `trainee_decisions`

Short-term:

* keep current table to avoid breaking existing flows
* still store draft or latest trainee-selected decision

Long-term:

* may become draft-layer only
* or be replaced by decision fields directly on `review_submissions`

#### `review_submissions`

Purpose:

* canonical submitted review iteration
* exact unit reviewer / ops_admin / super_admin / AI evaluates
* frozen context snapshot

Canonical interpretation of ids:

* `app_user_id` = actor who submitted the review iteration
* `reviewed_by_app_user_id` = actor who reviewed it
* `organization_id` = workflow organization context inherited from the thread
* `user_id` = simulator user target reference only

---

## 5. Database Design

### 5.1 New table: `review_submissions`

Recommended columns:

```sql
create table if not exists public.review_submissions (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.review_threads (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  app_user_id uuid not null references public.app_users (id) on delete cascade,
  alert_id text null references public.alerts (id) on delete set null,
  user_id uuid null references public.users (id) on delete set null,

  submission_version integer not null,

  submitted_root_comment_id uuid null references public.simulator_comments (id) on delete set null,
  submitted_at timestamptz not null default now(),

  decision_snapshot text null,
  proposed_alert_status text null,
  user_status_snapshot text null,
  alert_status_snapshot text null,
  rationale_snapshot text null,

  review_state text not null default 'submitted',
  evaluation text null,
  feedback text null,

  reviewed_by_app_user_id uuid null references public.app_users (id) on delete set null,
  reviewed_at timestamptz null,

  review_target_type text not null default 'human',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint review_submissions_review_state_check
    check (review_state in (
      'submitted',
      'in_review',
      'changes_requested',
      'approved',
      'closed'
    )),

  constraint review_submissions_evaluation_check
    check (evaluation in (
      'needs_work',
      'developing',
      'solid',
      'excellent'
    ) or evaluation is null),

  constraint review_submissions_target_check
    check (alert_id is not null or user_id is not null)
);
```

Compatibility note for current DB:

* in the current remote schema, `public.users.id` is `uuid`
* therefore `review_submissions.user_id` must also be `uuid`, not `text`

Permission note:

* access to `review_submissions` must be derived from `public.app_users`
* `user_id` references the simulator user target only and is not an actor id

### 5.2 Required indexes

```sql
create index if not exists review_submissions_thread_idx
  on public.review_submissions (thread_id, submitted_at desc);

create unique index if not exists review_submissions_thread_version_uidx
  on public.review_submissions (thread_id, submission_version);

create index if not exists review_submissions_state_idx
  on public.review_submissions (review_state, submitted_at desc);
```

### 5.3 Why a separate table is required

Without `review_submissions`:

* submitted review becomes mixed with mutable draft thread activity
* reviewer roles may review a moving thread instead of a frozen iteration
* billing and AI routing become harder
* email notifications have no clean event anchor

### 5.4 Suggested database entrypoints

Recommended database-level entrypoints for the workflow:

* `public.submit_review_submission(...)`
* `public.list_review_submissions(...)`
* `public.get_latest_review_submission(...)`
* `public.review_review_submission(...)`

These entrypoints should enforce canonical access rules via `public.app_users` and organization context.

---

## 6. Comment / Thread Logic

## 6.1 Thread meaning

One `review_thread` represents:

* one trainee review workspace
* one paid review session in the future
* one place where trainee and reviewer interact

It must **not** be recreated on every revision.

## 6.2 Comment types

Current comment types already exist:

* `user_comment`
* `admin_qa`
* `admin_private`

Add one more concept at the model/service layer:

* trainee comments can be either:
  * `draft-visible-to-trainee`
  * `review-visible`

Implementation options:

### Option A

Add `visibility` field to `simulator_comments`:

* `draft`
* `review`

### Option B

Infer visibility from whether the comment root is referenced by a `review_submission`

Recommended near-term approach:

* keep schema simple now
* use `submitted_root_comment_id` on `review_submissions`
* treat that root subtree as the submitted review branch

## 6.3 Can trainee continue writing after submit?

Yes, but with rules.

After `Submit for review`:

* the submitted branch becomes frozen as the reviewed iteration
* trainee can continue inside the same thread only as part of revision flow
* trainee must not silently mutate the already submitted branch during active review

Recommended behavior:

* if latest submission is `submitted` or `in_review`, trainee cannot edit the submitted root
* if reviewer sets `changes_requested`, trainee can add a new follow-up root or revision notes
* resubmission creates **a new submission version in the same thread**

## 6.4 Resubmit behavior

`Resubmit` must:

* stay inside the same `review_thread`
* create a new `review_submissions` row with incremented `submission_version`
* point to the latest trainee root or latest revision root

`Resubmit` must **not** create a new thread.

Reason:

* one paid review = one thread
* revisions should remain inside the same purchased review session

---

## 7. Review State and Evaluation

### 7.1 `review_state`

Recommended values:

* `submitted`
* `in_review`
* `changes_requested`
* `approved`
* `closed`

Notes:

* do not use `draft` here; draft belongs to thread/workspace before submission
* do not show `closed` prominently to trainee unless useful operationally

### 7.2 `evaluation`

Recommended values:

* `needs_work`
* `developing`
* `solid`
* `excellent`

`evaluation` must be `null` until a human or AI reviewer actually evaluates the submission.

Valid examples:

* `submitted` + `evaluation = null`
* `in_review` + `evaluation = null`
* `changes_requested` + `evaluation = developing`
* `approved` + `evaluation = solid`
* `approved` + `evaluation = excellent`

Invalid examples:

* `submitted` + `evaluation = solid`
* `submitted` + `evaluation = excellent`

---

## 8. Snapshot Rules

### 8.1 Required snapshot fields

Capture at submission time:

* `decision_snapshot`
* `proposed_alert_status`
* `user_status_snapshot`
* `alert_status_snapshot`
* `rationale_snapshot`

### 8.2 Explicitly not needed

Do not snapshot:

* `alert_severity`
* `alert_type`
* `rule_code`
* assignment owner

These are not needed for trainee review correctness.

### 8.3 Decision can be empty

The workflow must support submission without a final decision.

Meaning:

* `decision_snapshot` may be `null`
* UI should show `Decision at submission: Not selected`

This is a valid trainee behavior and can itself be reviewed.

---

## 9. Permissions

### 9.1 Trainee

Can:

* open own review thread
* add draft comments
* submit for review
* resubmit after feedback
* see own evaluations and feedback

Cannot:

* see admin private notes
* see other trainees' threads
* modify review result fields

### 9.2 Reviewer / Ops Admin / Super Admin

Can:

* view submitted review threads
* view frozen submission snapshot
* view current alert/user status context
* update `review_state`
* set `evaluation`
* add `feedback`
* reply in thread as reviewer

Cannot:

* directly change simulator user status from review UI
* directly change alert status from review UI

Review UI is read-only for domain statuses.

---

## 10. UI Placement

## 10.1 Simulator User Profile

Keep `Predefined Notes` where they already are.

Target structure:

### Block 1 — Predefined Notes

Unchanged.

Purpose:

* static reference/training notes

### Block 2 — Review Workspace

This becomes the main trainee/reviewer working area.

Inside it:

* left or upper sub-block: `Admin Private Notes`
* right or lower sub-block: `Trainee Review Workflow`

This block should replace trainee workflow inside the current mixed `Internal Notes` composition.

### Block 3 — Optional review history

Optional later:

* previous submissions in this thread
* evaluation history

## 10.2 Alert Page

No predefined notes block is required if the alert has no reference notes.

Target structure:

### Block 1 — Review Workspace

Inside it:

* `Admin Private Notes`
* `Trainee Review Workflow`

The visual composition should match the profile page as much as possible even if the data sources differ.

## 10.3 Admin Review Console

The review console must be thread-centric.

When clicking a thread, load:

* thread metadata
* target alert/profile context
* latest active `review_submission`
* submission snapshots
* trainee branch linked to `submitted_root_comment_id`
* reviewer feedback / evaluation form

Do not make the review screen depend only on raw latest comments.

---

## 11. Detailed UI Behavior

## 11.1 Trainee Review Workflow block

This block should contain:

### A. Draft / active work area

* trainee thread composer
* trainee messages
* current draft decision selector
* current proposed alert status selector

### B. Submission summary

If latest submission exists, show:

* `Submitted`
* `Decision at submission`
* `Proposed status at submission`
* `Alert status at submission`
* `Account status at submission`
* `Submitted at`

### C. Review result

If submission was reviewed, show:

* `Evaluation`
* `Reviewer feedback`
* `Reviewed at`

## 11.2 Visual distinction of authors

Must be obvious who wrote what.

Recommended treatment:

### Trainee messages

* cool neutral / blue-slate background
* label: `Trainee`
* timestamp
* submitted root can show badge `Submitted`

### Reviewer messages

* slightly warmer or more contrast border/background
* label: `Reviewer`
* timestamp

### Admin private notes

* do not mix into the same trainee conversation timeline
* keep in a separate panel adjacent to review workflow

This avoids confusion between:

* what trainee submitted
* what reviewer replied
* what is private reviewer-only case context

---

## 12. Admin Private Notes Placement

Admin private notes should remain visually near the trainee review workflow.

Reason:

* reviewer needs internal context while assessing trainee work
* these notes help reviewer understand the case
* reviewer should not have to switch tabs or scroll far away to see them

Recommended layout:

### Desktop

Two-column review workspace:

* left: `Admin Private Notes`
* right: `Trainee Review Workflow`

### Mobile

Stack vertically:

* `Admin Private Notes`
* `Trainee Review Workflow`

---

## 13. Data Loading Rules

### 13.1 Reviewer-role thread open action

When `reviewer`, `ops_admin`, or `super_admin` opens a thread in the review console:

1. load `review_thread`
2. load latest open `review_submission`
3. load alert/profile context for that thread
4. load current alert/user statuses
5. load submitted snapshot statuses
6. load trainee submitted branch from `submitted_root_comment_id`
7. load reviewer replies in the same thread

### 13.2 What must be shown in review thread view

At minimum:

* target alert or profile
* trainee name
* current alert status
* current simulator user status
* alert status at submission
* user status at submission
* decision at submission or `Not selected`
* proposed alert status or `Not selected`
* trainee rationale
* evaluation
* feedback

### 13.3 Reviewer roles cannot mutate domain statuses here

The review thread view must show statuses as context only.

`reviewer`, `ops_admin`, and `super_admin` can:

* review
* evaluate
* reply

They cannot:

* directly change alert status
* directly change simulator user/account status

Those belong to separate operational flows.

---

## 14. Future Monetization Model

This design supports paid review naturally.

### Product rule

* one `review_thread` = one paid review

Inside that paid review:

* trainee may receive feedback
* trainee may revise
* trainee may resubmit

All of this remains inside the same thread.

### New paid review

If trainee wants a completely separate new review:

* create new `review_thread`
* bill as new review

---

## 15. Future AI Review Support

This design is compatible with AI review.

Recommended future fields:

* `review_target_type`: `human` | `ai`
* `reviewed_by_app_user_id` nullable
* later optional `review_model` text

Meaning:

* same thread
* same submission
* same trainee UX
* different reviewer implementation

AI review result should populate the same structured output:

* `review_state`
* `evaluation`
* `feedback`

This makes future product packages possible:

* AI review
* human review
* AI review + human escalation

---

## 16. Future Email Notifications

Thread/submission model is a good basis for email events.

Suggested events:

* `review_submission_created`
* `review_in_review`
* `review_changes_requested`
* `review_resubmitted`
* `review_approved`
* `review_closed`

Potential recipients:

* trainee
* assigned reviewer
* organization managers later

---

## 17. Implementation Phases

## Phase 1 — Data model

1. add `review_submissions`
2. add indexes and RLS
3. add service layer for:
   * create submission
   * list submissions for thread
   * update review result
   * fetch latest active submission

## Phase 2 — Admin review flow

1. update review console query layer
2. make thread click load latest submission details
3. show snapshot statuses and decision summary
4. add evaluation + feedback actions

## Phase 3 — Trainee review flow

1. keep draft comments inside thread
2. add `Submit for review`
3. freeze current submission snapshot
4. add `Resubmit` inside same thread
5. show evaluation and feedback to trainee

## Phase 4 — UI restructuring

### Profile page

* keep `Predefined Notes` in place
* move `Admin Private Notes` next to trainee review workflow
* stop using current mixed `Internal Notes` block as the home of all meanings

### Alert page

* keep `Admin Private Notes`
* keep trainee workflow
* align block structure with profile page

---

## 18. Definition of Done

The feature is implemented correctly when:

* predefined notes remain separate and unchanged
* admin private notes are visually adjacent to review workflow
* trainee review work is separated from private notes
* each submission stores frozen status snapshots
* reviewer / ops_admin / super_admin can open a thread and see the exact submitted review context
* decision can be missing and is shown as `Not selected`
* resubmission stays inside the same thread
* review thread supports future human or AI review
* the UI clearly distinguishes trainee messages from reviewer messages
