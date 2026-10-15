import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { SectorHero } from '@/components/SectorHero';

const sections = [['about','عن ASLAN'],['vision','الرؤية'],['mission','الرسالة'],['activity','الأنشطة'],['project','المشاريع'],['portfolio','Portfolio'],['news','الأخبار'],['faq','الأسئلة الشائعة']];

export default async function CompanyPage() {
  const db = await createClient();
  const { data } = await db.from('company_content').select('content_type,slug,title,excerpt,body').eq('published',true).order('sort_order').order('published_at',{ascending:false});
  const items = data ?? [];
  return <main className="section"><div className="wrap"><SectorHero eyebrow="ASLAN MODELLING GROUP" title="تعرف على المجموعة" description="رؤيتنا ورسالتنا ومجالات نشاطنا ومشاريعنا وأعمالنا وأخبارنا." primary={{href:'/company/about',label:'من نحن'}} secondary={{href:'/company/portfolio',label:'أعمالنا'}} aside={{title:'الحرفة والتصميم والعمل',description:'نحوّل الحرفة إلى علامة، والتصميم إلى قيمة. استكشف المعلومات الرسمية المتاحة عن المؤسسة.',action:{href:'/contact',label:'التواصل مع ASLAN'}}}/><div className="grid three" style={{marginTop:32}}>{sections.map(([type,label])=>{const count=items.filter(x=>x.content_type===type).length;return <Link className="card" href={`/company/${type}`} key={type}><span className="kicker">{type.toUpperCase()}</span><h2>{label}</h2><p>{count?`${count} عنصر منشور`:'المحتوى سيضاف من لوحة الإدارة.'}</p></Link>})}</div></div></main>;
}
