begin;

drop policy if exists "selfie_insert_staff" on storage.objects;
create policy "selfie_insert_staff"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'selfie'
  and (public.is_super_admin() or public.is_ops_admin() or public.is_reviewer())
);

drop policy if exists "selfie_update_staff" on storage.objects;
create policy "selfie_update_staff"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'selfie'
  and (public.is_super_admin() or public.is_ops_admin() or public.is_reviewer())
)
with check (
  bucket_id = 'selfie'
  and (public.is_super_admin() or public.is_ops_admin() or public.is_reviewer())
);

drop policy if exists "selfie_delete_staff" on storage.objects;
create policy "selfie_delete_staff"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'selfie'
  and (public.is_super_admin() or public.is_ops_admin() or public.is_reviewer())
);

commit;
