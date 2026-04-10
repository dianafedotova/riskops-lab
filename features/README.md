# Features

Feature folders own domain behavior, data loading contracts, UI composition, and local helpers for one product area.

Target slices for incremental migration:

- `features/alerts`
- `features/users`
- `features/review-workspace`
- `features/cases`
- `features/admin`
- `features/auth`

Rules:

- Keep `app/**/page.tsx` thin and orchestration-only.
- Prefer colocating `components`, `queries`, `mutations`, `hooks`, and `lib` inside each feature.
- Do not place cross-feature utilities here; move those to `shared/**`.
