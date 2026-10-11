-- Trigger functions are invoked by PostgreSQL triggers, not through the public RPC API.
-- Do not expose the certificate issuer as a callable SECURITY DEFINER RPC.
revoke all on function public.issue_academy_certificate_on_pass() from public, anon, authenticated;
