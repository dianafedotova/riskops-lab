# Architecture

## Goals

RiskOps Lab is being refactored incrementally toward a feature-first architecture without changing business logic, data semantics, or page geometry.

## Current operating rules

- `app/**/page.tsx` should stay thin and focus on routing, orchestration, and layout.
- Feature modules should own domain behavior, local UI composition, and data contracts.
- `shared/**` should hold reusable primitives and helpers with no single feature ownership.
- Public pages should avoid auth-coupled server work where possible.
- Protected layouts are allowed to resolve the current user server-side.
- The brand mark is locked in `components/brand-mark.tsx` and is outside refactor scope.

## Target folder shape

```text
app/
features/
  alerts/
  users/
  review-workspace/
  cases/
  admin/
  auth/
shared/
  ui/
  lib/
  auth/
  supabase/
  types/
lib/
components/
tests/
docs/
```

## Render boundaries

- `app/layout.tsx`: global document shell only
- `app/(public)/layout.tsx`: static-friendly public shell and lazy client auth hydration
- `app/(protected)/layout.tsx`: protected shell with server-resolved current user
- `app/(auth)/layout.tsx`: auth shell without extra protected-data coupling

## Data access conventions

- Prefer explicit select lists over `.select("*")`.
- Keep temporary compat probes isolated and documented.
- Separate query/mutation responsibilities when touching domain services.
- Move schema compatibility fallbacks into neutral shared adapters.
