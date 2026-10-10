-- M17: remove the obsolete checkout overload and lock the live signature.
-- The JSONB shipping-address signature is the only application contract.

-- The legacy one-argument overload may never have existed in a clean
-- replay. Drop it conditionally before hardening the supported signature.
drop function if exists public.checkout_active_cart(text);

revoke execute on function public.checkout_active_cart(text, jsonb) from public;
revoke execute on function public.checkout_active_cart(text, jsonb) from anon;
grant execute on function public.checkout_active_cart(text, jsonb) to authenticated;
