
-- Curriculum metadata must obey the same visibility gate as courses.
create or replace function public.academy_curriculum(p_course_id text)
returns jsonb language sql stable security definer set search_path = ''
as $function$
 select coalesce(jsonb_agg(jsonb_build_object(
 'id',l.id,'module_id',l.module_id,'title',l.title,
 'lesson_type',l.lesson_type,'duration_minutes',l.duration_minutes,
 'sort_order',l.sort_order,'accessible',private.can_access_academy_lesson(l.id))
 order by m.sort_order,m.created_at,m.id,l.sort_order,l.created_at,l.id),'[]'::jsonb)
 from public.academy_lessons l
 join public.academy_modules m on m.id=l.module_id
 join public.courses c on c.id::text=m.course_id
 where m.course_id=p_course_id and l.status='published'
 and m.status='published' and c.status='published'
 and (c.visibility='public' or (
 auth.uid() is not null and (
 private.is_super_admin() or public.can_manage_academy_course(m.course_id)
 or exists(select 1 from public.academy_course_testers t
 where t.course_id=c.id and t.user_id=auth.uid())
 )));
$function$;
