-- M17 security closure: service requests must enter through the validated RPC.
-- The customer-facing UI already uses create_service_request; direct inserts could
-- otherwise forge initial lifecycle state because the old insert policy checked only owner.
revoke insert on public.service_requests from anon, authenticated;
drop policy if exists service_requests_owner_insert on public.service_requests;

-- Keep the existing admin-update policy and the state-machine RPC operational.
-- Customer UPDATE statements remain blocked by RLS; server actions use the validated RPC.
grant select on public.service_requests to authenticated;
