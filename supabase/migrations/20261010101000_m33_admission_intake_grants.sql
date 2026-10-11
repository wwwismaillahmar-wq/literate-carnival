-- Explicit grants for public course screening and application intake.
grant select on public.academy_admission_questions to anon, authenticated;
grant insert on public.academy_admission_applications to anon, authenticated;
grant select, update on public.academy_admission_applications to authenticated;
