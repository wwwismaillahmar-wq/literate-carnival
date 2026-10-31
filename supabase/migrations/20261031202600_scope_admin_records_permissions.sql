drop policy if exists admin_workspace_records_delegated on public.admin_workspace_records;
create policy admin_workspace_records_delegated on public.admin_workspace_records for all to authenticated
 using ((module='support' and public.check_permission(auth.uid(),'support.manage'))
     or (module='encyclopedias' and public.check_permission(auth.uid(),'encyclopedias.manage')))
 with check (created_by=auth.uid() and
   ((module='support' and public.check_permission(auth.uid(),'support.manage'))
     or (module='encyclopedias' and public.check_permission(auth.uid(),'encyclopedias.manage'))));