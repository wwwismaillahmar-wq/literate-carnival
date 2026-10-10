-- M36: finalize an identity profile only through an audited admin review.
create or replace function public.admin_review_partner_identity_profile(
  p_profile_id uuid,
  p_status text,
  p_review_note text default ''
)
returns table(profile_id uuid, review_status text, reviewer_id uuid, reviewed_at timestamptz, review_note text)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_profile public.partner_identity_profiles%rowtype;
  v_now timestamptz := now();
begin
  if auth.uid() is null or not private.is_super_admin(auth.uid()) then
    raise exception 'FORBIDDEN';
  end if;
  if p_status not in ('verified','rejected','needs_information','expired')
     or length(coalesce(p_review_note,'')) > 2000 then
    raise exception 'INVALID_REVIEW';
  end if;

  select * into v_profile
  from public.partner_identity_profiles
  where id = p_profile_id
  for update;
  if not found then raise exception 'IDENTITY_PROFILE_NOT_FOUND'; end if;

  if p_status = 'verified' and not exists (
    select 1 from public.partner_identity_documents d
    where d.identity_profile_id = v_profile.id
      and d.upload_status = 'uploaded'
      and d.review_status = 'verified'
  ) then
    raise exception 'IDENTITY_EVIDENCE_NOT_VERIFIED';
  end if;

  update public.partner_identity_profiles
  set review_status = p_status,
      reviewer_id = auth.uid(),
      reviewed_at = v_now,
      review_note = coalesce(p_review_note,''),
      updated_at = v_now
  where id = v_profile.id
  returning * into v_profile;

  return query select v_profile.id, v_profile.review_status, v_profile.reviewer_id, v_profile.reviewed_at, v_profile.review_note;
end;
$function$;

revoke all on function public.admin_review_partner_identity_profile(uuid,text,text) from public, anon;
grant execute on function public.admin_review_partner_identity_profile(uuid,text,text) to authenticated;
