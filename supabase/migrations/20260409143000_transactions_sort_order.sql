begin;

alter table public.transactions add column if not exists sort_order bigint;

with ranked as (
  select
    id,
    row_number() over (
      partition by user_id
      order by
        transaction_date desc,
        created_at desc,
        id desc
    ) as next_sort_order
  from public.transactions
)
update public.transactions as transactions
set sort_order = ranked.next_sort_order
from ranked
where transactions.id = ranked.id
  and transactions.sort_order is null;

alter table public.transactions alter column sort_order set default 0;
alter table public.transactions alter column sort_order set not null;

commit;
