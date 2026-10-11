-- M34: issue a verifiable certificate only after a server-graded passing attempt.
create table if not exists public.academy_certificates (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.academy_enrollments(id) on delete cascade,
  assessment_id uuid not null references public.academy_assessments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  certificate_code text not null unique check (certificate_code ~ '^ASL-[A-F0-9]{16}$'),
  issued_at timestamptz not null default now(),
  unique(enrollment_id, assessment_id)
);
create index if not exists academy_certificates_user_issued_idx
  on public.academy_certificates(user_id, issued_at desc);
alter table public.academy_certificates enable row level security;
drop policy if exists academy_certificates_read_own on public.academy_certificates;
create policy academy_certificates_read_own on public.academy_certificates
  for select to authenticated using (user_id = (select auth.uid()) or (select private.is_super_admin()));
grant select on public.academy_certificates to authenticated;

create or replace function public.issue_academy_certificate_on_pass()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  if new.passed then
    insert into public.academy_certificates(enrollment_id, assessment_id, user_id, certificate_code)
    values(new.enrollment_id, new.assessment_id, new.user_id,
      'ASL-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16)))
    on conflict (enrollment_id, assessment_id) do nothing;
  end if;
  return new;
end;
$function$;
revoke all on function public.issue_academy_certificate_on_pass() from public;
drop trigger if exists academy_certificate_after_pass on public.academy_assessment_attempts;
create trigger academy_certificate_after_pass
after insert on public.academy_assessment_attempts
for each row execute function public.issue_academy_certificate_on_pass();

create or replace function public.verify_academy_certificate(p_certificate_code text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $function$
  select jsonb_build_object(
    'valid', true,
    'certificateCode', c.certificate_code,
    'issuedAt', c.issued_at,
    'assessmentTitle', a.title
  )
  from public.academy_certificates c
  join public.academy_assessments a on a.id = c.assessment_id
  where c.certificate_code = upper(trim(p_certificate_code))
  limit 1;
$function$;
revoke all on function public.verify_academy_certificate(text) from public;
grant execute on function public.verify_academy_certificate(text) to anon, authenticated;
