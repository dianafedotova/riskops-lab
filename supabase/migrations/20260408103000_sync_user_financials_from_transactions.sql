begin;

create or replace function public.refresh_user_financials_cache(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null then
    return;
  end if;

  update public.users u
  set
    current_balance_usd = coalesce((
      select sum(
        case
          when lower(coalesce(t.direction, '')) = 'inbound' and lower(coalesce(t.status, '')) = 'completed'
            then coalesce(t.amount_usd, t.amount, 0)
          when lower(coalesce(t.direction, '')) = 'outbound' and lower(coalesce(t.status, '')) = 'completed'
            then -coalesce(t.amount_usd, t.amount, 0)
          else 0
        end
      )
      from public.transactions t
      where t.user_id = p_user_id
    ), 0),
    total_turnover_usd = coalesce((
      select sum(
        case
          when lower(coalesce(t.direction, '')) = 'inbound' and lower(coalesce(t.status, '')) = 'completed'
            then coalesce(t.amount_usd, t.amount, 0)
          else 0
        end
      )
      from public.transactions t
      where t.user_id = p_user_id
    ), 0)
  where u.id = p_user_id;
end;
$$;

create or replace function public.sync_user_financials_from_transaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_user_financials_cache(old.user_id);
    return old;
  end if;

  if tg_op = 'UPDATE' and old.user_id is distinct from new.user_id then
    perform public.refresh_user_financials_cache(old.user_id);
  end if;

  perform public.refresh_user_financials_cache(new.user_id);
  return new;
end;
$$;

drop trigger if exists trg_sync_user_financials_from_transactions on public.transactions;
create trigger trg_sync_user_financials_from_transactions
after insert or update or delete on public.transactions
for each row execute function public.sync_user_financials_from_transaction();

create or replace view public.user_financials as
select
  t.user_id,
  coalesce(sum(
    case
      when lower(coalesce(t.direction, '')) = 'inbound' and lower(coalesce(t.status, '')) = 'completed'
        then coalesce(t.amount_usd, t.amount, 0)
      when lower(coalesce(t.direction, '')) = 'outbound' and lower(coalesce(t.status, '')) = 'completed'
        then -coalesce(t.amount_usd, t.amount, 0)
      else 0
    end
  ), 0) as current_balance,
  coalesce(sum(
    case
      when lower(coalesce(t.direction, '')) = 'inbound' and lower(coalesce(t.status, '')) = 'completed'
        then coalesce(t.amount_usd, t.amount, 0)
      else 0
    end
  ), 0) as total_turnover
from public.transactions t
group by t.user_id;

update public.users u
set
  current_balance_usd = coalesce((
    select sum(
      case
        when lower(coalesce(t.direction, '')) = 'inbound' and lower(coalesce(t.status, '')) = 'completed'
          then coalesce(t.amount_usd, t.amount, 0)
        when lower(coalesce(t.direction, '')) = 'outbound' and lower(coalesce(t.status, '')) = 'completed'
          then -coalesce(t.amount_usd, t.amount, 0)
        else 0
      end
    )
    from public.transactions t
    where t.user_id = u.id
  ), 0),
  total_turnover_usd = coalesce((
    select sum(
      case
        when lower(coalesce(t.direction, '')) = 'inbound' and lower(coalesce(t.status, '')) = 'completed'
          then coalesce(t.amount_usd, t.amount, 0)
        else 0
      end
    )
    from public.transactions t
    where t.user_id = u.id
  ), 0);

commit;
