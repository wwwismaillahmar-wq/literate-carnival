-- ASLAN i18n: additive content translations; original records remain untouched.
create table if not exists public.content_translations (
  id bigint generated always as identity primary key,
  content_type text not null check (content_type in ('product','course','service')),
  content_id text not null,
  locale text not null check (locale in ('ar','fr','en','es','de','pt')),
  field text not null check (field in ('name','title','description')),
  translated_text text not null,
  status text not null default 'draft' check (status in ('draft','published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (content_type, content_id, locale, field)
);
alter table public.content_translations enable row level security;
revoke all on public.content_translations from anon, authenticated;
grant select on public.content_translations to anon, authenticated;
create policy "Published content translations are readable" on public.content_translations for select to anon, authenticated using (status = 'published');
-- Writes remain restricted to privileged server-side operations until role-based editorial policies are audited.
