-- The policy below joins media_assets to messages by message_id. The
-- original column-creation migration comes later in the timestamp order, so
-- establish the FK here before any policy references it. The later migration
-- keeps its IF NOT EXISTS guard for compatibility with already-upgraded DBs.
alter table public.media_assets
  add column if not exists message_id uuid references public.messages(id) on delete cascade;

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
