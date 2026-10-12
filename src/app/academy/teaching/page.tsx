import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AcademyAuthoringWorkspace } from '@/components/admin/AcademyAuthoringWorkspace';
export const dynamic = 'force-dynamic';
export default async function AcademyTeachingPage() {
 const db = await createClient();
 const {data:{user}}=await db.auth.getUser();
 if(!user) notFound();
 const {data:staff,error}=await db.from('academy_course_staff').select('course_id').eq('user_id',user.id).eq('status','active');
 if(error||!staff?.length) notFound();
 const ids=[...new Set(staff.map(x=>x.course_id))];
 const {data:rows,error:courseError}=await db.from('courses').select('id,title,description,duration,price_dzd,status').in('id',ids);
 if(courseError) notFound();
 const courses=(rows||[]).map((x:Record<string,unknown>)=>({id:String(x.id),title:String(x.title??x.name??x.id),description:typeof x.description==='string'?x.description:'',duration:typeof x.duration==='string'?x.duration:'',price_dzd:typeof x.price_dzd==='number'?x.price_dzd:null,status:typeof x.status==='string'?x.status:'draft'}));
 return <main className="section"><div className="wrap"><h1>مكتب التدريس والإشراف</h1><p className="muted">تظهر الدورات المسندة إلى حسابك فقط. أضف الوحدات والدروس والوسائط والاختبارات؛ تبقى إدارة بقية الدورات لدى الإدارة.</p><AcademyAuthoringWorkspace staffMode initialCourses={courses}/></div></main>;
}
