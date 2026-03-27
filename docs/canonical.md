# Use canonical.md as the single source of truth for:
#
# - role model
# - permission model
# - entity separation
# - access rules
#
# Do NOT modify canonical.md.
#
# When generating or refactoring code:
# - follow the role hierarchy exactly
# - use derived role helpers (isSuperAdmin, isTrainee, etc.)
# - do NOT introduce new role logic
# - do NOT use legacy roles ("user", "admin")
# - do NOT derive permissions from public.users or auth.users
#
# If something conflicts with existing code, follow canonical.md and refactor the code accordingly.

# RiskOps Lab — Canonical Data Model & Access Rules

## 1. Product Purpose

RiskOps Lab is a transaction monitoring (fraud / AML) simulator designed to provide hands-on experience for trainees reviewing user activity and alerts.

The system is NOT a real banking interface. It is an internal training environment where:

* simulator users represent synthetic or imported case subjects
* app users are real authenticated users of the platform
* trainees perform reviews, decisions, and analysis
* staff performs QA, moderation, and oversight
* internal workflow data is strictly separated from simulator data

---

## 2. Core Entity Layers

### 2.1 Auth User (`auth.users`)

Represents authentication identity.

Used for:

* login
* `auth.uid()`

Not used for:

* roles
* permissions
* organization membership

Canonical rule:

auth.users.id is only used as identity and is linked via:
public.app_users.auth_user_id

---

### 2.2 App User (`public.app_users`)

Represents the actual actor inside the system.

Stores:

* role
* organization_id
* is_active

Canonical rules:

* public.app_users is the ONLY source of truth for:

  * role
  * organization_id
  * is_active

* current user is always resolved via:
  public.app_users.auth_user_id = auth.uid()

❗ Never:

* app_users.id = auth.uid()

---

### 2.3 Simulator User (`public.users`)

Represents a case subject.

This is:

* NOT auth user
* NOT app user
* NOT a system actor

Canonical rules:

* public.users is the source of truth for simulator/domain data
* public.users must NEVER be used for permission decisions

---

## 3. Role Model

### 3.1 Canonical roles

super_admin
ops_admin
reviewer
trainee

Legacy roles (`admin`, `user`) are deprecated.

---

### 3.2 Role hierarchy

super_admin >= staff > trainee

Where:

staff = reviewer + ops_admin

Important:

* reviewer and ops_admin share the same permission level (staff)

* they must NOT be treated as hierarchical roles

* difference between them is workflow context (B2B vs B2C), not access level

* super_admin inherits ALL staff capabilities

* super_admin has additional privileged features

❗ Rule:

super_admin must always retain access to all staff-level functionality.
No feature should be restricted to ops_admin while excluding super_admin.

---

### 3.3 Canonical derived flags

Frontend and helper logic must use:

isSuperAdmin = role === "super_admin"
isOpsAdmin = role === "ops_admin"
isReviewer = role === "reviewer"
isTrainee = role === "trainee"

isBaseStaff = role === "reviewer" || role === "ops_admin"
canAccessStaffFeatures = role === "reviewer" || role === "ops_admin" || role === "super_admin"

❗ Do NOT use legacy flags:

* isAdminLike
* isStaffLike

---

## 4. Source of Truth

Auth identity → auth.users
App user context → public.app_users
Simulator users → public.users

---

## 5. Core Architectural Principles

### 5.1 Identity separation

Never mix:

* auth user
* app user
* simulator user

---

### 5.2 Data separation

Two domains:

Simulator data:

* users
* alerts
* transactions
* user_events
* user_payment_methods

Internal workflow data:

* review_threads
* simulator_comments
* admin_private_notes
* trainee_decisions
* trainee_alert_assignments
* trainee_user_watchlist
* internal_notes
* ops_events
* app_user_activity

---

### 5.3 Permission model

Permissions must ALWAYS be derived from:

public.app_users

❗ Never from:

* auth.users
* public.users
* frontend-only logic

---

### 5.4 Access resolution model

Access rules are defined per entity type.

Visibility depends on:

* role
* ownership
* organization context

Resolution flow:

1. Resolve app user via auth.uid()
2. Read role, organization_id, is_active
3. Compute permission flags
4. Apply access rules

---

## 6. Ownership Rules

* trainee can only see:

  * own assignments
  * own decisions
  * own watchlist

* other trainees’ data must NEVER be visible

---

## 7. Private Notes & Internal Data

### 7.1 Private notes

Private notes are NOT part of trainee-visible data.

Model:

* admin_private_notes are author-private by default
* visibility must be explicitly defined

---

### 7.2 Internal notes (predefined)

internal_notes:

* predefined system/internal notes
* may be visible to staff depending on org rules

---

### 7.3 Trainee notes & threads

Trainee-generated notes:

* visible to:

  * the trainee
  * reviewer / ops_admin (depending on org rules)
  * super_admin

Comment threads on trainee notes:

* visible to:

  * same trainee
  * reviewer / ops_admin
  * super_admin

---

## 8. Alert Identity Model

Alert identity must be clearly defined:

* one canonical ID for UI
* one technical ID (if needed)

❗ Mixing id and internal_id is NOT allowed.

---

## 9. Backup Tables

Backup tables:

* are NOT part of application model
* must NEVER be used in frontend or business logic

---

## 10. Critical Rules

* permissions must never be derived from public.users
* all access decisions must be based on public.app_users
* no inline role checks across components
* always use centralized role helpers

---

## 11. Target State

* role model consistent across DB and frontend
* no legacy role usage
* permissions centralized
* RLS and frontend aligned
* model fully documented

