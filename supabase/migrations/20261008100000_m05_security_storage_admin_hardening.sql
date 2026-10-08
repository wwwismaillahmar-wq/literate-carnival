-- M05: Security / Environment / Configuration hardening
-- Align storage and admin content writes with the same super-admin boundary.

drop policy if exists storage_insert_admin_product_media on storage.objects;
create policy storage_insert_admin_product_media on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'aslan-media'
    and (storage.foldername(name))[2] = 'products'
    and (select private.is_super_admin())
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists storage_delete_admin_product_media on storage.objects;
create policy storage_delete_admin_product_media on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'aslan-media'
    and (storage.foldername(name))[2] = 'products'
    and (select private.is_super_admin())
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists social_admin_delete on public.social_links;
create policy social_admin_delete on public.social_links
  for delete to authenticated
  using ((select private.is_super_admin()));

drop policy if exists social_admin_insert on public.social_links;
create policy social_admin_insert on public.social_links
  for insert to authenticated
  with check ((select private.is_super_admin()));

drop policy if exists social_admin_update on public.social_links;
create policy social_admin_update on public.social_links
  for update to authenticated
  using ((select private.is_super_admin()))
  with check ((select private.is_super_admin()));

drop policy if exists gallery_admin_delete on public.work_gallery;
create policy gallery_admin_delete on public.work_gallery
  for delete to authenticated
  using ((select private.is_super_admin()));

drop policy if exists gallery_admin_insert on public.work_gallery;
create policy gallery_admin_insert on public.work_gallery
  for insert to authenticated
  with check ((select private.is_super_admin()));

drop policy if exists gallery_admin_update on public.work_gallery;
create policy gallery_admin_update on public.work_gallery
  for update to authenticated
  using ((select private.is_super_admin()))
  with check ((select private.is_super_admin()));
