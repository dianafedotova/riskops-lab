begin;

-- Rail is only meaningful for bank transfers; other simulator types use channel only.
alter table public.transactions
  alter column rail drop not null;

commit;
