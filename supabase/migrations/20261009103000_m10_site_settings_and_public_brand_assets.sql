create table if not exists public.site_settings (
  setting_key text primary key,
  setting_value text not null default '',
  is_public boolean not null default true,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint site_settings_key_format check (setting_key ~ '^[a-z][a-z0-9_]*$')
);

alter table public.site_settings enable row level security;

drop policy if exists site_settings_public_read on public.site_settings;
create policy site_settings_public_read on public.site_settings
for select to anon, authenticated
using (is_public or (select private.is_super_admin()));

drop policy if exists site_settings_admin_insert on public.site_settings;
create policy site_settings_admin_insert on public.site_settings
for insert to authenticated
with check ((select private.is_super_admin()));

drop policy if exists site_settings_admin_update on public.site_settings;
create policy site_settings_admin_update on public.site_settings
for update to authenticated
using ((select private.is_super_admin()))
with check ((select private.is_super_admin()));

drop policy if exists site_settings_admin_delete on public.site_settings;
create policy site_settings_admin_delete on public.site_settings
for delete to authenticated
using ((select private.is_super_admin()));

grant select on public.site_settings to anon, authenticated;
grant insert, update, delete on public.site_settings to authenticated;

insert into public.site_settings(setting_key, setting_value, is_public) values
('brand_logo_path','',true),
('brand_tagline','تنجيد • خياطة • تفصيل',true),
('brand_gold','#c5a059',true),
('home_eyebrow','ASLAN MODELLING',true),
('home_title_primary','نبني الجودة.',true),
('home_title_accent','نصنع الثقة.',true),
('home_subtitle','تنجيد • خياطة • تفصيل — منتجات مخصصة، خدمات تنفيذية، وتكوين مهني ضمن منظومة ASLAN.',true),
('announcement_text','',true),
('footer_text','ASLAN Modelling Group — تنتج • تخدم • تكوّن • تتوسع',true),
('contact_phone','',true),
('contact_email','',true),
('contact_address','باتنة، الجزائر',true)
on conflict (setting_key) do nothing;

drop policy if exists storage_select_site_logo on storage.objects;
create policy storage_select_site_logo on storage.objects
for select to anon, authenticated
using (
  bucket_id = 'aslan-media'
  and exists (
    select 1 from public.site_settings s
    where s.setting_key = 'brand_logo_path'
      and s.setting_value = objects.name
      and s.is_public = true
  )
);
