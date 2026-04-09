begin;

create sequence if not exists public.alerts_seq;

create or replace function public.generate_alert_id()
returns text
language plpgsql
as $function$
begin
  return 'ALRT-' || lpad(nextval('public.alerts_seq')::text, 4, '0');
end;
$function$;

grant usage, select on sequence public.alerts_seq to authenticated;
grant execute on function public.generate_alert_id() to authenticated;

do $$
declare
  v_max_alert_num bigint;
begin
  select max((substring(id from 'ALRT-(\d+)$'))::bigint)
    into v_max_alert_num
  from public.alerts
  where id ~ '^ALRT-\d+$';

  if v_max_alert_num is null then
    perform setval('public.alerts_seq', 1, false);
  else
    perform setval('public.alerts_seq', v_max_alert_num, true);
  end if;
end
$$;

alter table public.alerts
  alter column id set default public.generate_alert_id();

alter table public.alerts
  alter column internal_id set default gen_random_uuid();

update public.alerts
set internal_id = gen_random_uuid()
where internal_id is null;

create temp table tmp_alert_id_remap (
  old_id text primary key,
  new_id text not null
) on commit drop;

insert into tmp_alert_id_remap (old_id, new_id)
select a.id, public.generate_alert_id()
from public.alerts a
where a.id is null
   or a.id !~ '^ALRT-\d+$';

do $$
begin
  if to_regclass('public.alerts_note') is not null then
    alter table public.alerts_note
      drop constraint if exists alerts_note_alert_id_fkey;

    update public.alerts_note n
    set alert_id = m.new_id
    from tmp_alert_id_remap m
    where n.alert_id = m.old_id;
  end if;

  if to_regclass('public.trainee_decisions') is not null then
    alter table public.trainee_decisions
      drop constraint if exists trainee_decisions_alert_id_fkey;

    update public.trainee_decisions d
    set alert_id = m.new_id
    from tmp_alert_id_remap m
    where d.alert_id = m.old_id;
  end if;

  if to_regclass('public.review_submissions') is not null then
    alter table public.review_submissions
      drop constraint if exists review_submissions_alert_id_fkey;

    update public.review_submissions s
    set alert_id = m.new_id
    from tmp_alert_id_remap m
    where s.alert_id = m.old_id;
  end if;

  if to_regclass('public.review_threads') is not null then
    alter table public.review_threads
      drop constraint if exists review_threads_alert_id_fkey;

    update public.review_threads t
    set alert_id = m.new_id
    from tmp_alert_id_remap m
    where t.alert_id = m.old_id;
  end if;
end
$$;

update public.alerts a
set id = m.new_id
from tmp_alert_id_remap m
where a.id is not distinct from m.old_id;

do $$
begin
  if to_regclass('public.alerts_note') is not null then
    alter table public.alerts_note
      add constraint alerts_note_alert_id_fkey
      foreign key (alert_id) references public.alerts (id) on delete cascade;
  end if;

  if to_regclass('public.trainee_decisions') is not null then
    alter table public.trainee_decisions
      add constraint trainee_decisions_alert_id_fkey
      foreign key (alert_id) references public.alerts (id) on delete set null;
  end if;

  if to_regclass('public.review_submissions') is not null then
    alter table public.review_submissions
      add constraint review_submissions_alert_id_fkey
      foreign key (alert_id) references public.alerts (id) on delete set null;
  end if;

  if to_regclass('public.review_threads') is not null then
    alter table public.review_threads
      add constraint review_threads_alert_id_fkey
      foreign key (alert_id) references public.alerts (id) on delete cascade;
  end if;
end
$$;

commit;
