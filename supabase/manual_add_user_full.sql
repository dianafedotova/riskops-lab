begin;

do $$
declare
  -- -------------------------------------------------------------------------
  -- Fill in the values below before running the script.
  -- The script is idempotent for the main user row: it upserts by external_user_id.
  -- You can safely set optional fields to null.
  -- You can also remove/comment optional insert blocks further below.
  -- -------------------------------------------------------------------------
  -- Required:
  --   v_org_slug
  --   v_external_user_id
  --   at least one of v_first_name / v_last_name
  --   v_registration_date
  --   v_status
  --   v_risk_level
  --
  -- Optional:
  --   everything else can be null unless your business flow needs it
  v_org_slug text := 'acme-b2b';
  v_external_user_id text := 'usr_manual_0001';

  -- Optional core profile fields.
  v_email text := 'new.user@example.com';
  v_first_name text := 'Anna';
  v_last_name text := 'Kovalenko';
  v_phone text := '+380671112233';
  v_country_code text := 'UA';
  v_country_name text := 'Ukraine';
  v_nationality text := 'Ukrainian';
  v_date_of_birth date := date '1994-05-12';
  v_registration_date date := current_date;
  v_address_text text := 'Kyiv, 01001, Khreshchatyk St, 1';

  -- Allowed values from current schema:
  -- tier: Tier 0, Tier 1, Tier 2, Tier 3, Tier 4, or null
  -- status: active, not_active, restricted, blocked, closed
  -- risk_level: Low, Medium, High
  -- tier is optional, status and risk_level are required.
  v_tier text := 'Tier 1';
  v_status text := 'active';
  v_risk_level text := 'Low';

  -- Optional KYC / employment / source-of-funds fields.
  v_occupation text := 'Operations specialist';
  v_employment_status text := 'employed';
  v_annual_income_min_usd numeric := 18000;
  v_annual_income_max_usd numeric := 28000;
  v_primary_source_of_funds text := 'salary';

  -- Optional evidence / document fields.
  v_proof_of_identity text := 'passport_verified';
  v_proof_of_address text := 'utility_bill_verified';
  v_source_of_funds_docs text := 'bank_statement_verified';
  v_selfie_path text := null;

  -- Optional balances. Null is also fine; script will store 0.
  v_current_balance_usd numeric(18,2) := 2500.00;
  v_total_turnover_usd numeric(18,2) := 12000.00;

  -- Optional metadata for inserts into related tables.
  -- If you comment out related blocks below, these variables are no longer needed.
  v_note_author text := 'manual-sql';
  v_payment_method_type text := 'card'; -- card | bank | crypto
  v_payment_method_status text := 'active'; -- active | frozen | blocked | closed
  v_event_type text := 'sign_up';
  v_ops_action_type text := 'poa_approved';

  v_org_id uuid;
  v_user_id uuid;
  v_full_name text;
begin
  v_full_name := btrim(concat_ws(' ', nullif(v_first_name, ''), nullif(v_last_name, '')));

  if nullif(v_org_slug, '') is null then
    raise exception 'Organization slug is required';
  end if;

  if nullif(v_external_user_id, '') is null then
    raise exception 'external_user_id is required';
  end if;

  if nullif(v_full_name, '') is null then
    raise exception 'At least one of first_name / last_name must be provided';
  end if;

  select o.id
  into v_org_id
  from public.organizations o
  where o.slug = v_org_slug
  limit 1;

  if v_org_id is null then
    raise exception 'Organization with slug "%" was not found', v_org_slug;
  end if;

  -- Main user upsert block.
  -- Keep this block: it creates or updates the user itself.
  insert into public.users (
    external_user_id,
    organization_id,
    email,
    first_name,
    last_name,
    full_name,
    phone,
    country_code,
    country_name,
    nationality,
    date_of_birth,
    registration_date,
    address_text,
    tier,
    status,
    risk_level,
    occupation,
    employment_status,
    annual_income_min_usd,
    annual_income_max_usd,
    primary_source_of_funds,
    proof_of_identity,
    proof_of_address,
    source_of_funds_docs,
    selfie_path,
    current_balance_usd,
    total_turnover_usd
  )
  values (
    v_external_user_id,
    v_org_id,
    nullif(v_email, ''),
    nullif(v_first_name, ''),
    nullif(v_last_name, ''),
    v_full_name,
    nullif(v_phone, ''),
    nullif(v_country_code, ''),
    nullif(v_country_name, ''),
    nullif(v_nationality, ''),
    v_date_of_birth,
    v_registration_date,
    nullif(v_address_text, ''),
    nullif(v_tier, ''),
    v_status,
    v_risk_level,
    nullif(v_occupation, ''),
    nullif(v_employment_status, ''),
    v_annual_income_min_usd,
    v_annual_income_max_usd,
    nullif(v_primary_source_of_funds, ''),
    nullif(v_proof_of_identity, ''),
    nullif(v_proof_of_address, ''),
    nullif(v_source_of_funds_docs, ''),
    nullif(v_selfie_path, ''),
    coalesce(v_current_balance_usd, 0),
    coalesce(v_total_turnover_usd, 0)
  )
  on conflict (external_user_id) do update
  set organization_id = excluded.organization_id,
      email = excluded.email,
      first_name = excluded.first_name,
      last_name = excluded.last_name,
      full_name = excluded.full_name,
      phone = excluded.phone,
      country_code = excluded.country_code,
      country_name = excluded.country_name,
      nationality = excluded.nationality,
      date_of_birth = excluded.date_of_birth,
      registration_date = excluded.registration_date,
      address_text = excluded.address_text,
      tier = excluded.tier,
      status = excluded.status,
      risk_level = excluded.risk_level,
      occupation = excluded.occupation,
      employment_status = excluded.employment_status,
      annual_income_min_usd = excluded.annual_income_min_usd,
      annual_income_max_usd = excluded.annual_income_max_usd,
      primary_source_of_funds = excluded.primary_source_of_funds,
      proof_of_identity = excluded.proof_of_identity,
      proof_of_address = excluded.proof_of_address,
      source_of_funds_docs = excluded.source_of_funds_docs,
      selfie_path = excluded.selfie_path,
      current_balance_usd = excluded.current_balance_usd,
      total_turnover_usd = excluded.total_turnover_usd,
      updated_at = now()
  returning id
  into v_user_id;

  -- -------------------------------------------------------------------------
  -- Optional related inserts. Keep enabled if you want a "full" profile.
  -- You can comment out or delete any whole block below without breaking the
  -- main user insert above.
  -- -------------------------------------------------------------------------

  -- Optional block: payment method.
  -- Remove/comment this block if you do not want to create a payment method.
  insert into public.user_payment_methods (
    user_id,
    type,
    masked_number,
    card_network,
    status,
    bank_type,
    account_number,
    wallet_type,
    wallet_address
  )
  select
    v_user_id,
    v_payment_method_type,
    case when v_payment_method_type = 'card' then '**** 4242' else null end,
    case when v_payment_method_type = 'card' then 'Visa' else null end,
    v_payment_method_status,
    case when v_payment_method_type = 'bank' then 'mono' else null end,
    case when v_payment_method_type = 'bank' then '****9012' else null end,
    case when v_payment_method_type = 'crypto' then 'EVM' else null end,
    case when v_payment_method_type = 'crypto' then '0x1234...abcd' else null end
  where not exists (
    select 1
    from public.user_payment_methods upm
    where upm.user_id = v_user_id
      and upm.type = v_payment_method_type
      and coalesce(upm.masked_number, '') = coalesce(case when v_payment_method_type = 'card' then '**** 4242' else null end, '')
      and coalesce(upm.account_number, '') = coalesce(case when v_payment_method_type = 'bank' then '****9012' else null end, '')
      and coalesce(upm.wallet_address, '') = coalesce(case when v_payment_method_type = 'crypto' then '0x1234...abcd' else null end, '')
  );

  -- Optional block: user event.
  -- Remove/comment this block if you do not want an initial event in history.
  insert into public.user_events (
    user_id,
    event_time,
    event_type,
    device_id,
    ip_address,
    country_code,
    device_name,
    created_at
  )
  select
    v_user_id,
    now(),
    v_event_type,
    'manual-device-1',
    '127.0.0.1',
    v_country_code,
    'Manual SQL Insert',
    now()
  where not exists (
    select 1
    from public.user_events ue
    where ue.user_id = v_user_id
      and ue.event_type = v_event_type
      and coalesce(ue.device_id, '') = 'manual-device-1'
      and coalesce(ue.ip_address, '') = '127.0.0.1'
  );

  -- Optional block: internal note.
  -- Remove/comment this block if you do not want a staff note on the user.
  insert into public.internal_notes (
    user_id,
    note_text,
    created_at,
    created_by,
    updated_at,
    updated_by
  )
  select
    v_user_id,
    format(
      'User %s (%s) was created/updated manually via SQL script for organization slug "%s".',
      v_full_name,
      v_external_user_id,
      v_org_slug
    ),
    now(),
    v_note_author,
    now(),
    v_note_author
  where not exists (
    select 1
    from public.internal_notes n
    where n.user_id = v_user_id
      and n.created_by = v_note_author
      and n.note_text = format(
        'User %s (%s) was created/updated manually via SQL script for organization slug "%s".',
        v_full_name,
        v_external_user_id,
        v_org_slug
      )
  );

  -- Optional block: ops event.
  -- Remove/comment this block if you do not want an ops/compliance event.
  insert into public.ops_events (
    user_id,
    event_time,
    action_type,
    performed_by,
    created_at
  )
  select
    v_user_id,
    now(),
    v_ops_action_type,
    v_note_author,
    now()
  where not exists (
    select 1
    from public.ops_events oe
    where oe.user_id = v_user_id
      and oe.action_type = v_ops_action_type
      and coalesce(oe.performed_by, '') = v_note_author
  );

  -- Example for linking accounts.
  -- Replace the linked external user id below with a real one, or remove/comment
  -- the whole block if linked accounts are not needed.
  if exists (
    select 1
    from public.users linked_u
    where linked_u.external_user_id = 'usr_manual_linked_0001'
      and linked_u.organization_id = v_org_id
  ) then
    insert into public.user_account_links (
      organization_id,
      user_id,
      linked_user_id,
      link_reason
    )
    select
      v_org_id,
      v_user_id::text,
      linked_u.id::text,
      'manual_related_account'
    from public.users linked_u
    where linked_u.external_user_id = 'usr_manual_linked_0001'
      and linked_u.organization_id = v_org_id
    on conflict (organization_id, user_id, linked_user_id) do update
    set link_reason = excluded.link_reason,
        updated_at = now();
  end if;

  raise notice 'User saved successfully. org_id=%, user_id=%, external_user_id=%',
    v_org_id, v_user_id, v_external_user_id;
end
$$;

commit;

-- Quick verification queries.
-- If you changed v_external_user_id above, replace 'usr_manual_0001' below too.
-- These selects are optional too: keep them if you want a quick post-run check.
select
  u.id,
  u.external_user_id,
  u.organization_id,
  u.full_name,
  u.email,
  u.tier,
  u.status,
  u.risk_level,
  u.created_at,
  u.updated_at
from public.users u
where u.external_user_id = 'usr_manual_0001';

select
  upm.id,
  upm.user_id,
  upm.type,
  upm.status,
  upm.created_at
from public.user_payment_methods upm
join public.users u on u.id = upm.user_id
where u.external_user_id = 'usr_manual_0001'
order by upm.created_at desc nulls last;

select
  ue.id,
  ue.user_id,
  ue.event_type,
  ue.event_time
from public.user_events ue
join public.users u on u.id = ue.user_id
where u.external_user_id = 'usr_manual_0001'
order by ue.event_time desc;
