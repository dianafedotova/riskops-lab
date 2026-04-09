alter table "public"."users" drop constraint if exists "users_tier_check";

alter table "public"."users"
add constraint "users_tier_check"
check (
  "tier" is null
  or "tier" = any (array[
    'Tier 0'::text,
    'Tier 1'::text,
    'Tier 2'::text,
    'Tier 3'::text,
    'Tier 4'::text
  ])
);
