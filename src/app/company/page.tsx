import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

const sections = [['about','عن ASLAN'],['vision','الرؤية'],['mission','الرسالة'],['activity','الأنشطة'],['project','المشاريع'],['portfolio','Portfolio'],['news','الأخبار'],['faq','الأسئلة الشائعة']];

export default async function CompanyPage() {
  const db = await createClient();
  const { data } = await db.from('company_content').select('content_type,slug,title,excerpt,body').eq('published',true).order('sort_order').order('published_at',{ascending:false});
  const items = data ?? [];
  return <main className="section"><div className="wrap"><span className="kicker">ASLAN MODELLING GROUP</span><h1 className="display">الشركة</h1><p className="lead">من نحن، رؤيتنا، رسالتنا، أنشطتنا، مشاريعنا، أعمالنا وأخبارنا.</p><div className="grid three" style={{marginTop:32}}>{sections.map(([type,label])=>{const count=items.filter(x=>x.content_type===type).length;return <Link className="card" href={`/company/${type}`} key={type}><span className="kicker">{type.toUpperCase()}</span><h2>{label}</h2><p>{count?`${count} عنصر منشور`:'المحتوى سيضاف من لوحة الإدارة.'}</p></Link>})}</div></div></main>;
}
