alter table public.profiles
  add column if not exists message_privacy text not null default 'all_members'
  check (message_privacy in ('members_only','all_members','community','friends'));

alter table public.media_assets
  add column if not exists message_id uuid references public.messages(id) on delete cascade;

create index if not exists media_assets_message_id_idx on public.media_assets(message_id);

create schema if not exists private;

create or replace function private.can_message(target_user uuid, sender_user uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select
    target_user is not null
    and sender_user is not null
    and target_user <> sender_user
    and exists (select 1 from public.profiles p where p.id = sender_user)
    and (
      (select p.message_privacy from public.profiles p where p.id = target_user) in ('members_only','all_members','community')
      or (
        (select p.message_privacy from public.profiles p where p.id = target_user) = 'friends'
        and exists (
          select 1
          from public.friendships f
          where f.status = 'accepted'
            and least(f.requester_id, f.addressee_id) = least(target_user, sender_user)
            and greatest(f.requester_id, f.addressee_id) = greatest(target_user, sender_user)
        )
      )
    );
$$;

revoke execute on function private.can_message(uuid, uuid) from public;
grant usage on schema private to authenticated;
grant execute on function private.can_message(uuid, uuid) to authenticated;

drop policy if exists conversations_insert_participant on public.conversations;
drop policy if exists conversations_select_participant on public.conversations;
drop policy if exists conversations_update_participant on public.conversations;
drop policy if exists messages_insert_sender on public.messages;
drop policy if exists messages_select_participant on public.messages;
drop policy if exists media_public_anon on public.media_assets;
drop policy if exists media_select_visible on public.media_assets;

create policy conversations_insert_participant
on public.conversations for insert to authenticated
with check (
  ((select auth.uid()) = participant_a or (select auth.uid()) = participant_b)
  and (select private.can_message(
    case when (select auth.uid()) = participant_a then participant_b else participant_a end,
    (select auth.uid())
  ))
);

create policy conversations_select_participant
on public.conversations for select to authenticated
using ((select auth.uid()) = participant_a or (select auth.uid()) = participant_b);

create policy conversations_update_participant
on public.conversations for update to authenticated
using ((select auth.uid()) = participant_a or (select auth.uid()) = participant_b)
with check ((select auth.uid()) = participant_a or (select auth.uid()) = participant_b);

create policy messages_insert_sender
on public.messages for insert to authenticated
with check (
  sender_id = (select auth.uid())
  and exists (
    select 1
    from public.conversations c
    where c.id = messages.conversation_id
      and ((select auth.uid()) = c.participant_a or (select auth.uid()) = c.participant_b)
      and (select private.can_message(
        case when (select auth.uid()) = c.participant_a then c.participant_b else c.participant_a end,
        (select auth.uid())
      ))
  )
);

create policy messages_select_participant
on public.messages for select to authenticated
using (
  exists (
    select 1 from public.conversations c
    where c.id = messages.conversation_id
      and ((select auth.uid()) = c.participant_a or (select auth.uid()) = c.participant_b)
  )
);

create policy media_public_anon
on public.media_assets for select to anon
using (
  exists (select 1 from public.posts p where p.id = media_assets.post_id and p.status = 'published'::content_status and p.visibility = 'public'::content_visibility)
  or exists (select 1 from public.contributions c where c.id = media_assets.contribution_id and c.status = 'published' and c.visibility = 'public'::content_visibility)
);

create policy media_select_visible
on public.media_assets for select to authenticated
using (
  owner_id = (select auth.uid())
  or exists (
    select 1 from public.posts p
    where p.id = media_assets.post_id and p.status = 'published'::content_status
      and (p.visibility = 'public'::content_visibility or (p.visibility = 'friends'::content_visibility and exists (
        select 1 from public.friendships f where f.status = 'accepted'
          and least(f.requester_id, f.addressee_id) = least(p.author_id, (select auth.uid()))
          and greatest(f.requester_id, f.addressee_id) = greatest(p.author_id, (select auth.uid()))
      )))
  )
  or exists (
    select 1 from public.contributions c
    where c.id = media_assets.contribution_id and c.status = 'published'
      and (c.visibility = 'public'::content_visibility or (c.visibility = 'friends'::content_visibility and exists (
        select 1 from public.friendships f where f.status = 'accepted'
          and least(f.requester_id, f.addressee_id) = least(c.user_id, (select auth.uid()))
          and greatest(f.requester_id, f.addressee_id) = greatest(c.user_id, (select auth.uid()))
      )))
  )
  or exists (
    select 1 from public.messages m
    join public.conversations c on c.id = m.conversation_id
    where m.id = media_assets.message_id
      and ((select auth.uid()) = c.participant_a or (select auth.uid()) = c.participant_b)
  )
);