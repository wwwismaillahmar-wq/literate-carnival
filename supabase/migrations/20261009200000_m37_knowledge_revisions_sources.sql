-- M37: preserve editorial history and bibliographic source metadata.
alter table public.knowledge_articles
  add column if not exists source_title text not null default '' check (length(source_title) <= 300),
  add column if not exists source_url text not null default '' check (length(source_url) <= 2048);

create table if not exists public.knowledge_article_revisions (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.knowledge_articles(id) on delete cascade,
  revision_number integer not null check (revision_number > 0),
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  edited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(article_id, revision_number)
);
create index if not exists knowledge_article_revisions_article_idx
  on public.knowledge_article_revisions(article_id, revision_number desc);
alter table public.knowledge_article_revisions enable row level security;
drop policy if exists knowledge_article_revisions_admin_read on public.knowledge_article_revisions;
create policy knowledge_article_revisions_admin_read on public.knowledge_article_revisions
  for select to authenticated using ((select private.is_super_admin()));
grant select on public.knowledge_article_revisions to authenticated;

create or replace function public.capture_knowledge_article_revision()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare next_revision integer;
begin
  if row(old.slug, old.title, old.excerpt, old.body, old.category, old.status, old.published_at, old.source_title, old.source_url)
     is distinct from
     row(new.slug, new.title, new.excerpt, new.body, new.category, new.status, new.published_at, new.source_title, new.source_url) then
    select coalesce(max(revision_number), 0) + 1 into next_revision
      from public.knowledge_article_revisions where article_id = old.id;
    insert into public.knowledge_article_revisions(article_id, revision_number, snapshot, edited_by)
    values (
      old.id, next_revision,
      jsonb_build_object(
        'slug', old.slug, 'title', old.title, 'excerpt', old.excerpt, 'body', old.body,
        'category', old.category, 'status', old.status, 'published_at', old.published_at,
        'source_title', old.source_title, 'source_url', old.source_url, 'updated_at', old.updated_at
      ),
      auth.uid()
    );
  end if;
  return new;
end;
$$;
revoke all on function public.capture_knowledge_article_revision() from public;
drop trigger if exists knowledge_article_revision_before_update on public.knowledge_articles;
create trigger knowledge_article_revision_before_update
before update on public.knowledge_articles
for each row execute function public.capture_knowledge_article_revision();
