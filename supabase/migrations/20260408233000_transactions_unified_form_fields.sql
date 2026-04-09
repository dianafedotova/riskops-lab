begin;

alter table public.transactions
  add column if not exists card_masked text,
  add column if not exists funding_card_masked text,
  add column if not exists counterparty_card_masked text,
  add column if not exists counterparty_user_id text,
  add column if not exists merchant_country text,
  add column if not exists mcc text,
  add column if not exists issuer_country text,
  add column if not exists iban_masked text,
  add column if not exists bank_country text,
  add column if not exists asset text,
  add column if not exists wallet_masked text,
  add column if not exists reject_reason jsonb;

alter table public.transactions drop constraint if exists transactions_reject_reason_check;

-- Align existing rows before (re)creating the check (non-rejected must have null reject_reason;
-- rejected must have a valid structured reason).
update public.transactions
set reject_reason = null
where lower(coalesce(status, '')) <> 'rejected'
  and reject_reason is not null;

update public.transactions
set reject_reason = jsonb_build_object(
  'code', 'GEN_01',
  'label', 'Processing error',
  'category', 'generic'
)
where lower(coalesce(status, '')) = 'rejected'
  and (
    reject_reason is null
    or jsonb_typeof(reject_reason) <> 'object'
    or not (reject_reason ? 'code' and reject_reason ? 'label' and reject_reason ? 'category')
    or btrim(coalesce(reject_reason->>'code', '')) = ''
    or btrim(coalesce(reject_reason->>'label', '')) = ''
    or not (
      (reject_reason->>'category') = any (array['card', '3ds', 'aml', 'generic']::text[])
    )
  );

alter table public.transactions add constraint transactions_reject_reason_check check (
  (
    lower(coalesce(status, '')) = 'rejected'
    and reject_reason is not null
    and jsonb_typeof(reject_reason) = 'object'
    and reject_reason ? 'code'
    and reject_reason ? 'label'
    and reject_reason ? 'category'
    and coalesce(reject_reason->>'code', '') <> ''
    and coalesce(reject_reason->>'label', '') <> ''
    and (reject_reason->>'category') = any (array['card', '3ds', 'aml', 'generic']::text[])
  )
  or (
    lower(coalesce(status, '')) <> 'rejected'
    and reject_reason is null
  )
);

commit;
