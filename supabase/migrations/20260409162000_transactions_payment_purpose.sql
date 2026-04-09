begin;

alter table public.transactions
  add column if not exists payment_reference text;

commit;
