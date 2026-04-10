# Supabase Setup

RiskOps Lab is `migrations-first`. Do not create product tables manually in Table Editor.

## 1. Create or choose a project

1. Create a Supabase project.
2. Copy the project URL and anon key.
3. Put them into `.env.local` and your deployment environment.

## 2. Apply migrations

Use the Supabase CLI against the target project and apply everything in `supabase/migrations/`.

Important migrations for public beta:

- `20260327231227_remote_schema.sql`
- `20260407220000_user_related_crud.sql`
- `20260409183000_public_beta_auth_provisioning.sql`

The public beta provisioning migration does three things:

- normalizes the shared `public-beta` organization
- installs the auth trigger that provisions `public.app_users`
- backfills existing `auth.users` into `public.app_users`

## 3. Configure Auth

In Supabase Auth settings, confirm:

- `Site URL` matches `NEXT_PUBLIC_SITE_URL`
- redirect URLs include:
  - `${NEXT_PUBLIC_SITE_URL}/auth/callback`
  - `${NEXT_PUBLIC_SITE_URL}/reset-password`
  - local equivalents for `http://localhost:3000`
- email confirmations are enabled
- Google OAuth is enabled
- Turnstile captcha is enabled

For local CLI-driven stacks, `supabase/config.toml` expects:

- `SUPABASE_AUTH_TURNSTILE_SECRET`

The app itself expects:

- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`

## 4. Verify provisioning

After signup, confirm the new auth user has a matching row in `public.app_users` with:

- `role = trainee`
- `organization_id = public-beta org id`
- `is_active = true`

If an older auth account existed without an `app_users` row, re-apply migrations or manually re-run the provisioning function from the migration path rather than inserting by hand.

## 5. Seed and access model

- Public beta users share one `public-beta` organization.
- Existing invite or org-code flows are not part of the public beta contract.
- Product data must remain synthetic-only.

## 6. Pre-launch checks

- `npm run lint`
- `npm test`
- `npm run build`
- auth callback works on the real public domain
- forgot/reset password works
- Google OAuth round-trip works
- support email and legal pages show the public beta messaging
