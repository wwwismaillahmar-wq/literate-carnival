create or replace function public.admin_search_accounts(search_text text)
returns table(id uuid, full_name text, username text, email text)
language sql stable security definer set search_path = ''
as $$
  select p.id,p.full_name,p.username,u.email::text
  from public.profiles p join auth.users u on u.id=p.id
  where auth.uid() is not null
    and (private.is_super_admin(auth.uid())
      or public.admin_has_permission('academy.manage')
      or public.admin_has_permission('admin.delegate'))
    and length(trim(search_text)) between 2 and 80
    and (p.full_name ilike '%'||replace(replace(search_text,'%','\%'),'_','\_')||'%'
      or p.username ilike '%'||replace(replace(search_text,'%','\%'),'_','\_')||'%'
      or u.email ilike '%'||replace(replace(search_text,'%','\%'),'_','\_')||'%')
  order by p.full_name nulls last limit 20;
$$;
revoke all on function public.admin_search_accounts(text) from public,anon;
grant execute on function public.admin_search_accounts(text) to authenticated;