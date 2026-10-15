import 'server-only';
import { createClient } from '@/lib/supabase/server';
export async function getCourseOfferings(courseId:string) {
  const db = await createClient();
  const result = await db.from('academy_course_offerings').select('id,school_id,branch_id,language,capacity').eq('course_id',courseId).eq('status','published').order('created_at');
  const schoolIds = [...new Set((result.data ?? []).map(row=>row.school_id))];
  const branchIds = [...new Set((result.data ?? []).map(row=>row.branch_id).filter((id):id is string=>Boolean(id)))];
  const [schools,branches] = await Promise.all([
    schoolIds.length ? db.from('academy_schools').select('id,name,status').in('id',schoolIds) : Promise.resolve({data:[],error:null}),
    branchIds.length ? db.from('academy_branches').select('id,name,status').in('id',branchIds) : Promise.resolve({data:[],error:null}),
  ]);
  const activeSchools = new Map((schools.data ?? []).filter(row=>row.status==='active').map(row=>[row.id,row.name]));
  const activeBranches = new Map((branches.data ?? []).filter(row=>row.status==='active').map(row=>[row.id,row.name]));
  const offerings = (result.data ?? []).filter(row=>activeSchools.has(row.school_id) && (!row.branch_id || activeBranches.has(row.branch_id))).map(row=>({
    id:row.id,label:activeSchools.get(row.school_id)+(row.branch_id?' / '+activeBranches.get(row.branch_id):''),language:row.language,capacity:row.capacity,
  }));
  return {offerings,error:Boolean(result.error || schools.error || branches.error),unavailable:Boolean(result.data?.length && !offerings.length)};
}
