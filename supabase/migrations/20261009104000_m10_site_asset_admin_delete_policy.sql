drop policy if exists storage_delete_admin_site_assets on storage.objects;
create policy storage_delete_admin_site_assets on storage.objects
for delete to authenticated
using (
  bucket_id = 'aslan-media'
  and (storage.foldername(name))[2] = 'site'
  and (select private.is_super_admin())
);
