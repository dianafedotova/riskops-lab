# Trainee role naming unification — change report

Canonical trainee role string is now **`trainee`** everywhere it previously used legacy **`user`** for `public.app_users.role` and `public.simulator_comments.author_role`. Staff roles (`reviewer`, `ops_admin`, `super_admin`) and policy structure are unchanged.

## New migration

| File | Purpose |
|------|---------|
| `supabase/migrations/20260327100000_trainee_role_naming.sql` | Drop CHECKs; `UPDATE` `user`→`trainee`; recreate CHECKs; `DROP POLICY` / `CREATE POLICY` for affected RLS; `CREATE OR REPLACE` `trainee_top_comment_still_editable` |

## Updated reference schema

| File | Changes |
|------|---------|
| `supabase/schema.sql` | `app_users.role` CHECK; `simulator_comments.author_role` CHECK; all `me.role = 'trainee'` / `author_role = 'trainee'` in policies and `trainee_top_comment_still_editable` |

## Policies recreated (same names, literals only)

- `review_threads_insert_trainee` on `public.review_threads`
- `trainee_decisions_insert` on `public.trainee_decisions`
- `trainee_assign_write` on `public.trainee_alert_assignments`
- `trainee_watch_write` on `public.trainee_user_watchlist`
- `sim_comments_insert_user` on `public.simulator_comments`
- `sim_comments_update_user_trainee_root` on `public.simulator_comments`

## SQL function

| Object | Change |
|--------|--------|
| `public.trainee_top_comment_still_editable(uuid)` | `author_role = 'trainee'` instead of `'user'` |

## TypeScript

| File | Changes |
|------|---------|
| `lib/types.ts` | `PersistedWorkflowAuthorRole`: `"admin" \| "trainee"` |
| `lib/services/comments.ts` | Inserts use `author_role: "trainee"` for trainee discussion rows |

## Intentionally not changed

- **Older migration** `20250328150000_app_user_staff_roles.sql` still documents the prior CHECK containing `'user'`; a full `supabase db reset` / ordered migrations applies `20260327100000_*` afterward and ends in the `trainee` state.
- **UI fallback strings** like `"user"` in `simulator-comments-panel.tsx` (display placeholder for missing author label) are not app-role literals.
- **`comment_type`** `user_comment` is unchanged (domain comment kind, not `app_users.role`).
- **Table/column names** `user_id`, `public.users`, etc.

## Deploy checklist

1. Run migration on Supabase (CLI or SQL editor).
2. Verify `app_users.role` CHECK allows only `trainee`, `reviewer`, `ops_admin`, `super_admin`.
3. Smoke-test trainee: insert review thread, discussion comment, assignment toggle, watchlist, root-comment edit window.
