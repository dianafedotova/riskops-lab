# Refactor Program

## Scope

This program improves correctness, maintainability, UI consistency, and repository professionalism without changing business logic.

## Baseline guardrails

- No business logic changes unless fixing an unintended bug and covered by a regression test.
- No logo edits or logo repositioning.
- No unplanned layout shifts.
- Every phase must keep `lint`, `typecheck`, `test`, and `build` green.

## Active implementation tracks

1. Foundation and guardrails
2. Correctness fixes and regression coverage
3. Render boundary cleanup
4. Feature skeleton and shared foundations
5. UI standardization for controls and form shells
6. Feature-slice extraction
7. Data-access normalization
8. UI and smoke-test expansion
9. Repo polish and CI hardening

## Exit criteria

- Shared helpers no longer hide inside unrelated domain files.
- Public routes are not forced dynamic by global auth resolution.
- Branded dropdown/date/modal/form primitives are standardized.
- New code has an obvious home in either `features/**` or `shared/**`.
