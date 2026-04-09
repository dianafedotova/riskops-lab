begin;

alter table public.transactions
  add column if not exists status_code text,
  add column if not exists reason_code text,
  add column if not exists status_display text,
  add column if not exists reason_display text;

update public.transactions
set reject_reason = null
where coalesce(type, '') <> 'Card top-up'
  and reject_reason is not null;

update public.transactions
set
  status_code = case
    when lower(coalesce(status, '')) = 'completed' then 'ACSC'
    when lower(coalesce(status, '')) = 'pending' then 'ACSP'
    else 'RJCT'
  end,
  status_display = case
    when lower(coalesce(status, '')) = 'completed' then 'Completed'
    when lower(coalesce(status, '')) = 'pending' then 'Accepted'
    else 'Rejected'
  end,
  reason_code = case
    when lower(coalesce(status, '')) in ('completed', 'pending') then null
    when lower(coalesce(reject_reason->>'label', '')) like '%insufficient%' then 'AM04'
    when lower(coalesce(reject_reason->>'label', '')) like '%forbidden%' then 'AG01'
    when coalesce(reject_reason->>'code', '') = '57' then 'AG01'
    when lower(coalesce(reject_reason->>'label', '')) like '%fraud%' then 'FF01'
    when coalesce(reject_reason->>'code', '') in ('59', 'AML_01') then 'FF01'
    when lower(coalesce(reject_reason->>'label', '')) like '%account%' then 'AC01'
    else 'MS03'
  end,
  reason_display = case
    when lower(coalesce(status, '')) in ('completed', 'pending') then null
    when lower(coalesce(reject_reason->>'label', '')) like '%insufficient%' then 'Insufficient funds'
    when lower(coalesce(reject_reason->>'label', '')) like '%forbidden%' then 'Transaction forbidden'
    when coalesce(reject_reason->>'code', '') = '57' then 'Transaction forbidden'
    when lower(coalesce(reject_reason->>'label', '')) like '%fraud%' then 'Fraud suspected'
    when coalesce(reject_reason->>'code', '') in ('59', 'AML_01') then 'Fraud suspected'
    when lower(coalesce(reject_reason->>'label', '')) like '%account%' then 'Invalid account details'
    else 'Reason not specified'
  end
where coalesce(type, '') = 'Bank transfer';

update public.transactions
set
  status_code = null,
  reason_code = null,
  status_display = null,
  reason_display = null
where coalesce(type, '') <> 'Bank transfer'
  and (
    status_code is not null
    or reason_code is not null
    or status_display is not null
    or reason_display is not null
  );

alter table public.transactions drop constraint if exists transactions_reject_reason_check;

alter table public.transactions add constraint transactions_reject_reason_check check (
  (
    lower(coalesce(status, '')) = 'rejected'
    and coalesce(type, '') = 'Card top-up'
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
    (
      lower(coalesce(status, '')) <> 'rejected'
      or coalesce(type, '') <> 'Card top-up'
    )
    and reject_reason is null
  )
);

alter table public.transactions drop constraint if exists transactions_bank_transfer_iso_check;

alter table public.transactions add constraint transactions_bank_transfer_iso_check check (
  (
    coalesce(type, '') = 'Bank transfer'
    and (
      (
        status_code = 'ACSP'
        and lower(coalesce(status, '')) = 'pending'
        and status_display = 'Accepted'
        and reason_code is null
        and reason_display is null
      )
      or (
        status_code = 'ACSC'
        and lower(coalesce(status, '')) = 'completed'
        and status_display = 'Completed'
        and reason_code is null
        and reason_display is null
      )
      or (
        status_code = 'RJCT'
        and lower(coalesce(status, '')) = 'rejected'
        and status_display = 'Rejected'
        and reason_code = any (array['AC01', 'AM04', 'AG01', 'FF01', 'MS03']::text[])
        and reason_display = any (
          array[
            'Invalid account details',
            'Insufficient funds',
            'Transaction forbidden',
            'Fraud suspected',
            'Reason not specified'
          ]::text[]
        )
      )
    )
  )
  or (
    coalesce(type, '') <> 'Bank transfer'
    and status_code is null
    and reason_code is null
    and status_display is null
    and reason_display is null
  )
);

commit;
