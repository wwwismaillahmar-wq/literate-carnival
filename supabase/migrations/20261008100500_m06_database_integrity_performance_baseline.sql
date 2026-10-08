-- M06: Database Architecture integrity and performance baseline.
-- Enforce invariants already satisfied by current production data.

create unique index if not exists profiles_username_ci_unique
  on public.profiles (lower(username))
  where username is not null;

create unique index if not exists friendships_pair_unique
  on public.friendships (
    least(requester_id, addressee_id),
    greatest(requester_id, addressee_id)
  );

alter table public.media_assets
  drop constraint if exists media_assets_exactly_one_parent;

alter table public.media_assets
  add constraint media_assets_exactly_one_parent
  check (
    ((product_id is not null)::integer +
     (post_id is not null)::integer +
     (contribution_id is not null)::integer +
     (message_id is not null)::integer) = 1
  );

create index if not exists media_assets_post_id_idx on public.media_assets(post_id) where post_id is not null;
create index if not exists media_assets_contribution_id_idx on public.media_assets(contribution_id) where contribution_id is not null;
create index if not exists media_assets_message_id_idx on public.media_assets(message_id) where message_id is not null;
create index if not exists media_assets_product_id_idx on public.media_assets(product_id) where product_id is not null;
create index if not exists posts_author_status_created_idx on public.posts(author_id, status, created_at desc);
create index if not exists contributions_user_status_created_idx on public.contributions(user_id, status, created_at desc);
create index if not exists products_active_featured_priority_idx on public.products(active, home_featured, ad_priority desc, created_at desc);
create index if not exists leads_status_created_idx on public.leads(status, created_at desc);
