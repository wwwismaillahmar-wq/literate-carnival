-- ASLAN social messaging and storage RLS
-- Applied to Supabase project zyenfobyorjfwkdgeube.

create policy "storage_insert_aslan_media_owner_path"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'aslan-media'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "storage_select_aslan_media_visible"
on storage.objects
for select
to authenticated, anon
using (
  bucket_id = 'aslan-media'
  and exists (
    select 1
    from public.media_assets m
    left join public.posts p on p.id = m.post_id
    left join public.contributions c on c.id = m.contribution_id
    where m.bucket_id = storage.objects.bucket_id
      and m.object_path = storage.objects.name
      and (
        m.owner_id = (select auth.uid())
        or (p.id is not null and p.status = 'published' and p.visibility = 'public')
        or (
          p.id is not null and p.status = 'published' and p.visibility = 'friends'
          and exists (
            select 1 from public.friendships f
            where f.status = 'accepted'
              and least(f.requester_id, f.addressee_id) = least(p.author_id, (select auth.uid()))
              and greatest(f.requester_id, f.addressee_id) = greatest(p.author_id, (select auth.uid()))
          )
        )
        or (c.id is not null and c.status = 'published' and c.visibility = 'public')
        or (
          c.id is not null and c.status = 'published' and c.visibility = 'friends'
          and exists (
            select 1 from public.friendships f
            where f.status = 'accepted'
              and least(f.requester_id, f.addressee_id) = least(c.user_id, (select auth.uid()))
              and greatest(f.requester_id, f.addressee_id) = greatest(c.user_id, (select auth.uid()))
          )
        )
      )
  )
);

create policy "storage_update_aslan_media_owner"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'aslan-media'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
)
with check (
  bucket_id = 'aslan-media'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "storage_delete_aslan_media_owner"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'aslan-media'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "messages_update_sender" on public.messages;
create policy "messages_update_read_participant"
on public.messages
for update
to authenticated
using (
  exists (
    select 1 from public.conversations c
    where c.id = messages.conversation_id
      and ((select auth.uid()) = c.participant_a or (select auth.uid()) = c.participant_b)
  )
)
with check (
  exists (
    select 1 from public.conversations c
    where c.id = messages.conversation_id
      and ((select auth.uid()) = c.participant_a or (select auth.uid()) = c.participant_b)
  )
  and sender_id = messages.sender_id
  and conversation_id = messages.conversation_id
);

revoke update on table public.messages from authenticated;
grant update (read_at) on table public.messages to authenticated;
