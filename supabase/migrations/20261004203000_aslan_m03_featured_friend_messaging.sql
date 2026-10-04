begin;

alter table public.posts
  add column if not exists featured boolean not null default false,
  add column if not exists featured_at timestamptz,
  add column if not exists featured_by uuid references auth.users(id) on delete set null,
  add column if not exists featured_order integer not null default 0;

alter table public.contributions
  add column if not exists featured boolean not null default false,
  add column if not exists featured_at timestamptz,
  add column if not exists featured_by uuid references auth.users(id) on delete set null,
  add column if not exists featured_order integer not null default 0;

create index if not exists posts_featured_feed_idx
  on public.posts(featured, featured_order, published_at desc)
  where status = 'published' and visibility = 'public';

create index if not exists contributions_featured_feed_idx
  on public.contributions(featured, featured_order, published_at desc)
  where status = 'published' and visibility = 'public';

drop policy if exists conversations_insert_participant on public.conversations;
create policy conversations_insert_participant
on public.conversations for insert to authenticated
with check (
  (select auth.uid()) in (participant_a, participant_b)
  and exists (
    select 1
    from public.friendships f
    where f.status = 'accepted'
      and least(f.requester_id, f.addressee_id) = least(participant_a, participant_b)
      and greatest(f.requester_id, f.addressee_id) = greatest(participant_a, participant_b)
  )
);

drop policy if exists messages_insert_sender on public.messages;
create policy messages_insert_sender
on public.messages for insert to authenticated
with check (
  sender_id = (select auth.uid())
  and exists (
    select 1
    from public.conversations c
    where c.id = messages.conversation_id
      and (select auth.uid()) in (c.participant_a, c.participant_b)
      and exists (
        select 1
        from public.friendships f
        where f.status = 'accepted'
          and least(f.requester_id, f.addressee_id) = least(c.participant_a, c.participant_b)
          and greatest(f.requester_id, f.addressee_id) = greatest(c.participant_a, c.participant_b)
      )
  )
);

commit;
