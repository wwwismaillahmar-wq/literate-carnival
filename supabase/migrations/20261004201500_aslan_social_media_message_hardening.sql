-- Harden media metadata ownership and message read-state updates.

drop policy if exists "media_insert_own" on public.media_assets;
create policy "media_insert_own"
on public.media_assets
for insert
to authenticated
with check (
  owner_id = (select auth.uid())
  and bucket_id = 'aslan-media'
  and (storage.foldername(object_path))[1] = (select auth.uid()::text)
);

drop policy if exists "messages_update_read_participant" on public.messages;
create policy "messages_update_read_recipient"
on public.messages
for update
to authenticated
using (
  sender_id <> (select auth.uid())
  and exists (
    select 1 from public.conversations c
    where c.id = messages.conversation_id
      and ((select auth.uid()) = c.participant_a or (select auth.uid()) = c.participant_b)
  )
)
with check (
  sender_id <> (select auth.uid())
  and exists (
    select 1 from public.conversations c
    where c.id = messages.conversation_id
      and ((select auth.uid()) = c.participant_a or (select auth.uid()) = c.participant_b)
  )
);