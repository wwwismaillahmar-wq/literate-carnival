create policy "storage_select_aslan_message_media_participants"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'aslan-media'
  and exists (
    select 1
    from media_assets m
    join messages msg on msg.id = m.message_id
    join conversations conv on conv.id = msg.conversation_id
    where m.bucket_id = objects.bucket_id
      and m.object_path = objects.name
      and (conv.participant_a = (select auth.uid()) or conv.participant_b = (select auth.uid()))
  )
);
