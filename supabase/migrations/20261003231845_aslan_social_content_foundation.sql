begin;

create extension if not exists pgcrypto;

do $$ begin
  create type public.content_visibility as enum ('public','friends','private');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.content_status as enum ('draft','pending','needs_revision','accepted','published','rejected','archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.friendship_status as enum ('pending','accepted','rejected','cancelled','blocked');
exception when duplicate_object then null; end $$;

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status public.friendship_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  accepted_at timestamptz,
  constraint friendships_no_self check (requester_id <> addressee_id)
);

create unique index if not exists friendships_pair_unique
on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));

create index if not exists friendships_requester_idx on public.friendships(requester_id, created_at desc);
create index if not exists friendships_addressee_idx on public.friendships(addressee_id, created_at desc);
create index if not exists friendships_accepted_pair_idx
on public.friendships(least(requester_id, addressee_id), greatest(requester_id, addressee_id))
where status = 'accepted';

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  content text not null default '',
  visibility public.content_visibility not null default 'public',
  status public.content_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  constraint posts_title_length check (char_length(title) between 1 and 160),
  constraint posts_content_length check (char_length(content) <= 10000)
);

create index if not exists posts_author_created_idx on public.posts(author_id, created_at desc);
create index if not exists posts_public_feed_idx on public.posts(status, visibility, created_at desc);

alter table public.contributions
  add column if not exists visibility public.content_visibility not null default 'private';

alter table public.contributions
  add column if not exists published_at timestamptz;

-- This historical migration must replay against both the legacy schema and
-- schemas where equivalent contribution constraints already exist. PostgreSQL
-- has no ADD CONSTRAINT IF NOT EXISTS, so guard by constraint name explicitly.
do $
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.contributions'::regclass
      and conname = 'contributions_title_length'
  ) then
    alter table public.contributions
      add constraint contributions_title_length
      check (char_length(title) between 1 and 160);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.contributions'::regclass
      and conname = 'contributions_content_length'
  ) then
    alter table public.contributions
      add constraint contributions_content_length
      check (char_length(content) <= 10000);
  end if;
end $;

create index if not exists contributions_visibility_idx
on public.contributions(status, visibility, created_at desc);

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid references public.posts(id) on delete cascade,
  contribution_id uuid references public.contributions(id) on delete cascade,
  bucket_id text not null default 'aslan-media',
  object_path text not null,
  media_type text not null check (media_type in ('image','video','file')),
  mime_type text not null,
  file_size bigint,
  created_at timestamptz not null default now(),
  constraint media_one_parent check (
    ((post_id is not null)::int + (contribution_id is not null)::int) = 1
  ),
  constraint media_path_owner check (object_path like owner_id::text || '/%')
);

create index if not exists media_assets_owner_idx on public.media_assets(owner_id, created_at desc);
create index if not exists media_assets_post_idx on public.media_assets(post_id, created_at);
create index if not exists media_assets_contribution_idx on public.media_assets(contribution_id, created_at);

create table if not exists public.moderation_reviews (
  id uuid primary key default gen_random_uuid(),
  reviewer_id uuid references auth.users(id) on delete set null,
  post_id uuid references public.posts(id) on delete cascade,
  contribution_id uuid references public.contributions(id) on delete cascade,
  decision public.content_status not null,
  note text,
  created_at timestamptz not null default now(),
  constraint moderation_one_parent check (
    ((post_id is not null)::int + (contribution_id is not null)::int) = 1
  )
);

create index if not exists moderation_post_idx on public.moderation_reviews(post_id, created_at desc);
create index if not exists moderation_contribution_idx on public.moderation_reviews(contribution_id, created_at desc);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  participant_a uuid not null references auth.users(id) on delete cascade,
  participant_b uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint conversations_no_self check (participant_a <> participant_b)
);

create unique index if not exists conversations_pair_unique
on public.conversations (least(participant_a, participant_b), greatest(participant_a, participant_b));

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint messages_body_length check (char_length(body) between 1 and 5000)
);

create index if not exists messages_conversation_created_idx
on public.messages(conversation_id, created_at desc);
create index if not exists messages_sender_idx
on public.messages(sender_id, created_at desc);

insert into storage.buckets (id, name, public)
values ('aslan-media', 'aslan-media', false)
on conflict (id) do update set public = false;

alter table public.friendships enable row level security;
alter table public.posts enable row level security;
alter table public.contributions enable row level security;
alter table public.media_assets enable row level security;
alter table public.moderation_reviews enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

drop policy if exists friendships_select_participants on public.friendships;
drop policy if exists friendships_insert_requester on public.friendships;
drop policy if exists friendships_update_participants on public.friendships;
drop policy if exists friendships_delete_participants on public.friendships;

create policy friendships_select_participants
on public.friendships for select to authenticated
using ((select auth.uid()) in (requester_id, addressee_id));

create policy friendships_insert_requester
on public.friendships for insert to authenticated
with check ((select auth.uid()) = requester_id and requester_id <> addressee_id);

create policy friendships_update_participants
on public.friendships for update to authenticated
using ((select auth.uid()) in (requester_id, addressee_id))
with check ((select auth.uid()) in (requester_id, addressee_id));

create policy friendships_delete_participants
on public.friendships for delete to authenticated
using ((select auth.uid()) in (requester_id, addressee_id));

drop policy if exists posts_select_visible on public.posts;
drop policy if exists posts_insert_own on public.posts;
drop policy if exists posts_update_own on public.posts;
drop policy if exists posts_delete_own on public.posts;

create policy posts_select_visible
on public.posts for select to authenticated
using (
  author_id = (select auth.uid())
  or (status = 'published' and visibility = 'public')
  or (
    status = 'published'
    and visibility = 'friends'
    and exists (
      select 1 from public.friendships f
      where f.status = 'accepted'
        and least(f.requester_id, f.addressee_id) = least(posts.author_id, (select auth.uid()))
        and greatest(f.requester_id, f.addressee_id) = greatest(posts.author_id, (select auth.uid()))
    )
  )
);

create policy posts_insert_own
on public.posts for insert to authenticated
with check (author_id = (select auth.uid()));

create policy posts_update_own
on public.posts for update to authenticated
using (author_id = (select auth.uid()))
with check (author_id = (select auth.uid()));

create policy posts_delete_own
on public.posts for delete to authenticated
using (author_id = (select auth.uid()));

drop policy if exists "Users can view their own contributions" on public.contributions;
drop policy if exists "Users can create their own contributions" on public.contributions;
drop policy if exists "Users can update their own pending contributions" on public.contributions;

create policy contributions_select_visible
on public.contributions for select to authenticated
using (
  user_id = (select auth.uid())
  or (status = 'published' and visibility = 'public')
  or (
    status = 'published'
    and visibility = 'friends'
    and exists (
      select 1 from public.friendships f
      where f.status = 'accepted'
        and least(f.requester_id, f.addressee_id) = least(contributions.user_id, (select auth.uid()))
        and greatest(f.requester_id, f.addressee_id) = greatest(contributions.user_id, (select auth.uid()))
    )
  )
);

create policy contributions_insert_own
on public.contributions for insert to authenticated
with check (user_id = (select auth.uid()));

create policy contributions_update_own
on public.contributions for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists media_select_visible on public.media_assets;
drop policy if exists media_insert_own on public.media_assets;
drop policy if exists media_update_own on public.media_assets;
drop policy if exists media_delete_own on public.media_assets;

create policy media_select_visible
on public.media_assets for select to authenticated
using (
  owner_id = (select auth.uid())
  or exists (
    select 1 from public.posts p
    where p.id = media_assets.post_id
      and p.status = 'published'
      and (
        p.visibility = 'public'
        or (p.visibility = 'friends' and exists (
          select 1 from public.friendships f
          where f.status = 'accepted'
            and least(f.requester_id, f.addressee_id) = least(p.author_id, (select auth.uid()))
            and greatest(f.requester_id, f.addressee_id) = greatest(p.author_id, (select auth.uid()))
        ))
      )
  )
  or exists (
    select 1 from public.contributions c
    where c.id = media_assets.contribution_id
      and c.status = 'published'
      and (
        c.visibility = 'public'
        or (c.visibility = 'friends' and exists (
          select 1 from public.friendships f
          where f.status = 'accepted'
            and least(f.requester_id, f.addressee_id) = least(c.user_id, (select auth.uid()))
            and greatest(f.requester_id, f.addressee_id) = greatest(c.user_id, (select auth.uid()))
        ))
      )
  )
);

create policy media_insert_own
on public.media_assets for insert to authenticated
with check (owner_id = (select auth.uid()));

create policy media_update_own
on public.media_assets for update to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

create policy media_delete_own
on public.media_assets for delete to authenticated
using (owner_id = (select auth.uid()));

drop policy if exists moderation_select_owner on public.moderation_reviews;
create policy moderation_select_owner
on public.moderation_reviews for select to authenticated
using (
  exists (select 1 from public.posts p where p.id = moderation_reviews.post_id and p.author_id = (select auth.uid()))
  or exists (select 1 from public.contributions c where c.id = moderation_reviews.contribution_id and c.user_id = (select auth.uid()))
);

drop policy if exists conversations_select_participant on public.conversations;
drop policy if exists conversations_insert_participant on public.conversations;
drop policy if exists conversations_update_participant on public.conversations;
drop policy if exists conversations_delete_participant on public.conversations;

create policy conversations_select_participant
on public.conversations for select to authenticated
using ((select auth.uid()) in (participant_a, participant_b));

create policy conversations_insert_participant
on public.conversations for insert to authenticated
with check ((select auth.uid()) in (participant_a, participant_b));

create policy conversations_update_participant
on public.conversations for update to authenticated
using ((select auth.uid()) in (participant_a, participant_b))
with check ((select auth.uid()) in (participant_a, participant_b));

create policy conversations_delete_participant
on public.conversations for delete to authenticated
using ((select auth.uid()) in (participant_a, participant_b));

drop policy if exists messages_select_participant on public.messages;
drop policy if exists messages_insert_sender on public.messages;
drop policy if exists messages_update_sender on public.messages;
drop policy if exists messages_delete_sender on public.messages;

create policy messages_select_participant
on public.messages for select to authenticated
using (
  exists (
    select 1 from public.conversations c
    where c.id = messages.conversation_id
      and (select auth.uid()) in (c.participant_a, c.participant_b)
  )
);

create policy messages_insert_sender
on public.messages for insert to authenticated
with check (
  sender_id = (select auth.uid())
  and exists (
    select 1 from public.conversations c
    where c.id = messages.conversation_id
      and (select auth.uid()) in (c.participant_a, c.participant_b)
  )
);

create policy messages_update_sender
on public.messages for update to authenticated
using (sender_id = (select auth.uid()))
with check (sender_id = (select auth.uid()));

create policy messages_delete_sender
on public.messages for delete to authenticated
using (sender_id = (select auth.uid()));

drop policy if exists posts_public_anon on public.posts;
drop policy if exists contributions_public_anon on public.contributions;
drop policy if exists media_public_anon on public.media_assets;

create policy posts_public_anon
on public.posts for select to anon
using (status = 'published' and visibility = 'public');

create policy contributions_public_anon
on public.contributions for select to anon
using (status = 'published' and visibility = 'public');

create policy media_public_anon
on public.media_assets for select to anon
using (
  exists (select 1 from public.posts p where p.id = media_assets.post_id and p.status = 'published' and p.visibility = 'public')
  or exists (select 1 from public.contributions c where c.id = media_assets.contribution_id and c.status = 'published' and c.visibility = 'public')
);

commit;
