-- M17 UI activation: allow the super-admin console to read inactive products too.
-- Public storefront visibility remains restricted to active products.
drop policy if exists products_admin_select on public.products;
create policy products_admin_select on public.products
  for select to authenticated
  using ((select private.is_super_admin()));
