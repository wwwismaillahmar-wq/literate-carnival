-- M17 security closure: service requests must enter through the validated RPC and
-- change lifecycle only through transition_service_request / transactional quote APIs.
-- The customer-facing UI already uses create_service_request; admin transitions use RPC.
revoke insert, update, delete on public.service_requests from anon, authenticated;

drop policy if exists service_requests_owner_insert on public.service_requests;
drop policy if exists service_requests_admin_update on public.service_requests;

-- Keep row visibility isolated; write operations are performed by SECURITY DEFINER
-- transactions that validate ownership, service availability and lifecycle transitions.
grant select on public.service_requests to authenticated;
