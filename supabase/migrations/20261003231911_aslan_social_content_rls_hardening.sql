begin;

drop policy if exists "Users can create their own contributions" on public.contributions;
drop policy if exists "Users can view their own contributions" on public.contributions;
drop policy if exists "Users can update their own pending contributions" on public.contributions;

drop index if exists public.friendships_pair_unique;
create unique index if not exists friendships_active_pair_unique
on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id))
where status in ('pending','accepted','blocked');

create index if not exists conversations_participant_a_idx on public.conversations(participant_a);
create index if not exists conversations_participant_b_idx on public.conversations(participant_b);
create index if not exists moderation_reviews_reviewer_idx on public.moderation_reviews(reviewer_id);

drop policy if exists contributions_update_own on public.contributions;
create policy contributions_update_own
on public.contributions for update to authenticated
using (user_id = (select auth.uid()) and status in ('pending','needs_revision'))
with check (user_id = (select auth.uid()) and status in ('pending','needs_revision'));

drop policy if exists posts_update_own on public.posts;
create policy posts_update_own
on public.posts for update to authenticated
using (author_id = (select auth.uid()) and status in ('draft','pending','needs_revision'))
with check (author_id = (select auth.uid()) and status in ('draft','pending','needs_revision'));

commit;
