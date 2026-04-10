# RiskOps Lab

Public beta training workspace for fraud and AML investigation practice. The product is intentionally `synthetic-only`: do not enter real customer data, credentials, secrets, or live case materials.

## Stack

- Next.js 16 App Router
- React 19
- Supabase Auth + Postgres
- Tailwind CSS 4
- Vitest
- Vercel Analytics / Speed Insights

## Local development

1. Copy `.env.example` to `.env.local`.
2. Fill in at least:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL`
   - `NEXT_PUBLIC_SUPPORT_EMAIL`
3. Run `npm install`.
4. Run `npm run dev`.

## Required production env

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPPORT_EMAIL`
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- `SUPABASE_AUTH_TURNSTILE_SECRET`
- `NEXT_PUBLIC_SENTRY_DSN`
- `SENTRY_DSN` (optional server / edge override)
- `SENTRY_AUTH_TOKEN`
- `SENTRY_ORG`
- `SENTRY_PROJECT`
- `SENTRY_ENVIRONMENT` (optional)

## Required GitHub Actions secrets

- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_DB_PASSWORD`

`main` now auto-applies pending SQL migrations to the linked Supabase project after `lint`, `test`, and `build` pass in CI. The linked production project ref is `wadctkaeltnizmbpwfsv`.

## Public beta auth contract

- Open signup is enabled.
- Email/password and Google OAuth are supported.
- Email confirmation must stay enabled.
- New `auth.users` rows are auto-provisioned into `public.app_users`.
- Default role is `trainee`.
- Default organization is the shared `public-beta` organization.
- `need_app_user` is legacy-only and should not be part of the normal signup flow.

## Database workflow

- Treat `supabase/migrations/` as the source of truth.
- Apply migrations before testing auth or seeded training scenarios.
- The migration `20260409183000_public_beta_auth_provisioning.sql` seeds or normalizes the shared public beta organization and installs the auth trigger that provisions `public.app_users`.

## Quality gates

Run these before merging or deploying:

```bash
npm run lint
npm test
npm run build
```

`main` should stay green on all three.

## Deployment sequence

1. Confirm production env vars are present in Vercel and Supabase.
2. Confirm GitHub Actions secrets `SUPABASE_ACCESS_TOKEN` and `SUPABASE_DB_PASSWORD` are set.
3. Verify Supabase Auth settings:
   - Site URL matches `NEXT_PUBLIC_SITE_URL`
   - Redirect URLs include `/auth/callback` and `/reset-password`
   - Email confirmations enabled
   - Turnstile enabled
   - Google provider enabled
4. Merge to `main` or run the `CI` workflow manually so the migration job applies pending SQL.
5. Deploy the Next.js app.
6. Run the smoke checklist below.

## Smoke checklist

- Public landing page loads with updated beta/legal copy.
- Signup works with email/password.
- Email confirmation returns to the app correctly.
- Google OAuth signup/sign-in returns to `/auth/callback` and lands in `/dashboard`.
- Forgot-password sends a reset link.
- Reset-password flow returns to sign-in successfully.
- A brand-new auth user gets a `public.app_users` row with role `trainee`.
- Protected routes redirect guests to `/sign-in`.
- Error pages, `robots.txt`, and `sitemap.xml` resolve.
- Monitoring receives at least one forced test event before public launch.
- Sentry receives one client exception, one server exception, and one replay-linked event before public launch.

## Rollback

1. Disable public marketing or signup entry points if the incident affects auth.
2. Roll back the Vercel deployment if the issue is app-only.
3. If the issue is schema-related, apply a compensating migration instead of editing production tables manually.
4. Re-run the smoke checklist after recovery.

## Support and beta operations

- Support contact is driven by `NEXT_PUBLIC_SUPPORT_EMAIL`.
- Funnel beta issues to one owned inbox before launch.
- Keep a short known-issues list for testers.
- Treat Sentry alerts as part of the release gate, not as optional cleanup.
