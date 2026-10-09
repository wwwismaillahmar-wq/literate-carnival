-- Keep the parameterized SECURITY DEFINER function with DEFAULT auth.uid().
-- The no-argument overload had no dependent objects and made policy calls ambiguous.
drop function private.is_super_admin();
