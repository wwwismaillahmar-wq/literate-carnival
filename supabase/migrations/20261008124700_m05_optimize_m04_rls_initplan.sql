do $$
declare
  r record;
begin
  for r in
    select tablename, policyname, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and policyname in (
        'm04 roles readable',
        'm04 permissions readable',
        'm04 role permissions readable',
        'm04 user roles readable',
        'm04 organizations create',
        'm04 organizations member read',
        'm04 organizations update',
        'm04 memberships delete',
        'm04 memberships insert',
        'm04 memberships read',
        'm04 memberships update'
      )
  loop
    if r.qual is not null then
      execute format(
        'alter policy %I on public.%I using (%s)',
        r.policyname,
        r.tablename,
        replace(r.qual, 'auth.uid()', '(select auth.uid())')
      );
    end if;

    if r.with_check is not null then
      execute format(
        'alter policy %I on public.%I with check (%s)',
        r.policyname,
        r.tablename,
        replace(r.with_check, 'auth.uid()', '(select auth.uid())')
      );
    end if;
  end loop;
end $$;
