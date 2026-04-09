begin;

alter table public.simulator_comments
  add column if not exists body_json jsonb;

alter table public.simulator_comments
  add column if not exists body_format text not null default 'plain_text';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'simulator_comments_body_format_check'
      and conrelid = 'public.simulator_comments'::regclass
  ) then
    alter table public.simulator_comments
      add constraint simulator_comments_body_format_check
      check (body_format in ('plain_text', 'tiptap_json'));
  end if;
end
$$;

comment on column public.simulator_comments.body_json is
  'Tiptap/ProseMirror JSON document for rich trainee/reviewer notes. Null for legacy plain-text rows.';

comment on column public.simulator_comments.body_format is
  'Content discriminator for simulator_comments: plain_text or tiptap_json.';

grant update (body, body_json, body_format, updated_at) on public.simulator_comments to authenticated;

alter table public.admin_private_notes
  add column if not exists body_json jsonb;

alter table public.admin_private_notes
  add column if not exists body_format text not null default 'plain_text';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'admin_private_notes_body_format_check'
      and conrelid = 'public.admin_private_notes'::regclass
  ) then
    alter table public.admin_private_notes
      add constraint admin_private_notes_body_format_check
      check (body_format in ('plain_text', 'tiptap_json'));
  end if;
end
$$;

comment on column public.admin_private_notes.body_json is
  'Tiptap/ProseMirror JSON document for rich staff-only private notes. Null for legacy plain-text rows.';

comment on column public.admin_private_notes.body_format is
  'Content discriminator for admin_private_notes: plain_text or tiptap_json.';

grant update (body, body_json, body_format, updated_at) on public.admin_private_notes to authenticated;

create or replace function public.plain_text_to_tiptap_doc(p_text text)
returns jsonb
language plpgsql
immutable
as $$
declare
  normalized_text text;
  paragraphs text[];
  paragraph text;
  lines text[];
  line text;
  line_count integer;
  i integer;
  doc_content jsonb := '[]'::jsonb;
  paragraph_content jsonb;
begin
  normalized_text := replace(coalesce(p_text, ''), E'\r', '');

  if btrim(normalized_text) = '' then
    return jsonb_build_object(
      'type', 'doc',
      'content', jsonb_build_array(
        jsonb_build_object('type', 'paragraph')
      )
    );
  end if;

  paragraphs := regexp_split_to_array(normalized_text, E'\n\s*\n');

  foreach paragraph in array paragraphs loop
    lines := string_to_array(paragraph, E'\n');
    line_count := coalesce(array_length(lines, 1), 0);
    paragraph_content := '[]'::jsonb;

    if line_count = 0 then
      doc_content := doc_content || jsonb_build_array(
        jsonb_build_object('type', 'paragraph')
      );
      continue;
    end if;

    for i in 1..line_count loop
      line := lines[i];

      if line <> '' then
        paragraph_content := paragraph_content || jsonb_build_array(
          jsonb_build_object(
            'type', 'text',
            'text', line
          )
        );
      end if;

      if i < line_count then
        paragraph_content := paragraph_content || jsonb_build_array(
          jsonb_build_object('type', 'hardBreak')
        );
      end if;
    end loop;

    if jsonb_array_length(paragraph_content) = 0 then
      doc_content := doc_content || jsonb_build_array(
        jsonb_build_object('type', 'paragraph')
      );
    else
      doc_content := doc_content || jsonb_build_array(
        jsonb_build_object(
          'type', 'paragraph',
          'content', paragraph_content
        )
      );
    end if;
  end loop;

  return jsonb_build_object(
    'type', 'doc',
    'content', doc_content
  );
end;
$$;

update public.simulator_comments
set
  body_json = public.plain_text_to_tiptap_doc(body),
  body_format = 'tiptap_json'
where coalesce(body, '') <> ''
  and body_json is null;

update public.admin_private_notes
set
  body_json = public.plain_text_to_tiptap_doc(body),
  body_format = 'tiptap_json'
where coalesce(body, '') <> ''
  and body_json is null;

commit;
