begin;

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
  exists (
    select 1 from public.posts p
    where p.id = media_assets.post_id
      and p.status = 'published'
      and p.visibility = 'public'
  )
  or exists (
    select 1 from public.contributions c
    where c.id = media_assets.contribution_id
      and c.status = 'published'
      and c.visibility = 'public'
  )
);

commit;
