-- Staging-only proposal: atomic free admission approval; never bypass payment for paid courses.
create or replace function public.admin_decide_academy_admission(
 p_application_id uuid, p_status text, p_note text default ''
) returns jsonb language plpgsql security definer set search_path = ''
as $fn$
declare a public.academy_admission_applications%rowtype;
 c public.courses%rowtype; e public.academy_enrollments%rowtype;
begin
 if auth.uid() is null or not coalesce(private.is_super_admin(),false) then raise exception 'FORBIDDEN'; end if;
 if p_status not in ('under_review','accepted','rejected','needs_information','cancelled','expired')
 or length(coalesce(p_note,''))>4000 then raise exception 'INVALID_DECISION'; end if;
 select * into a from public.academy_admission_applications where id=p_application_id for update;
 if not found then raise exception 'ADMISSION_NOT_FOUND'; end if;
 if not (a.status='submitted' and p_status in ('under_review','accepted','rejected','needs_information','cancelled','expired')
 or a.status='under_review' and p_status in ('accepted','rejected','needs_information','cancelled','expired')
 or a.status='needs_information' and p_status in ('under_review','accepted','rejected','cancelled','expired')
 or a.status in ('accepted','payment_pending') and p_status in ('cancelled','expired'))
 then raise exception 'INVALID_TRANSITION'; end if;
 if p_status='accepted' then
   select * into c from public.courses where id::text=a.course_id for share;
   if not found then raise exception 'COURSE_NOT_FOUND'; end if;
   if c.price_dzd is null or c.price_dzd<0 then raise exception 'INVALID_COURSE_PRICE'; end if;
   if c.price_dzd=0 then
     if a.user_id is null then raise exception 'STUDENT_ACCOUNT_REQUIRED'; end if;
     insert into public.academy_enrollments(user_id,course_id,offering_id,status,completed_at)
     values(a.user_id,a.course_id,a.offering_id,'enrolled',null)
     on conflict on constraint academy_enrollments_user_id_course_id_key
     do update set status=case when public.academy_enrollments.offering_id is not distinct from excluded.offering_id
       and public.academy_enrollments.status <> 'completed' then 'enrolled'
       else public.academy_enrollments.status end
     returning * into e;
     if e.offering_id is distinct from a.offering_id then raise exception 'ENROLLMENT_OFFERING_MISMATCH'; end if;
   end if;
 end if;
 update public.academy_admission_applications
 set status=p_status,reviewer_id=auth.uid(),reviewed_at=now(),review_note=coalesce(p_note,''),updated_at=now()
 where id=a.id returning * into a;
 return jsonb_build_object('id',a.id,'course_id',a.course_id,'status',a.status,
 'review_note',a.review_note,'reviewed_at',a.reviewed_at,'updated_at',a.updated_at,
 'enrolled',e.id is not null);
end;$fn$;
revoke all on function public.admin_decide_academy_admission(uuid,text,text) from public,anon;
grant execute on function public.admin_decide_academy_admission(uuid,text,text) to authenticated;

-- A restricted published course must remain readable to its enrolled students.
create or replace function private.can_access_academy_lesson(p_lesson_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $fn$
 select auth.uid() is not null and exists(
 select 1 from public.academy_lessons l
 join public.academy_modules m on m.id=l.module_id
 join public.courses c on c.id::text=m.course_id
 where l.id=p_lesson_id and (
 public.can_manage_academy_course(m.course_id)
 or (
 l.status='published' and m.status='published' and c.status='published'
 and (c.visibility='public' or exists (
   select 1 from public.academy_course_testers t where t.course_id=c.id and t.user_id=auth.uid()
 ) or exists (
   select 1 from public.academy_enrollments permitted where permitted.course_id=m.course_id
   and permitted.user_id=auth.uid() and permitted.status in ('enrolled','completed')
 ))
 and exists(
 select 1 from public.academy_enrollments e
 where e.user_id=auth.uid() and e.course_id=m.course_id
 and e.status in ('enrolled','completed')
 and (c.lesson_release_mode='open' or not exists(
 select 1 from public.academy_lessons prior
 join public.academy_modules pm on pm.id=prior.module_id
 where pm.course_id=m.course_id and prior.status='published' and pm.status='published'
 and (pm.sort_order,pm.created_at,pm.id,prior.sort_order,prior.created_at,prior.id)
     <(m.sort_order,m.created_at,m.id,l.sort_order,l.created_at,l.id)
 and not exists(select 1 from public.academy_lesson_progress p
 where p.enrollment_id=e.id and p.lesson_id=prior.id and p.completed)
 ))
 )
 ))
 );
$fn$;
revoke all on function private.can_access_academy_lesson(uuid) from public;
grant execute on function private.can_access_academy_lesson(uuid) to authenticated;
