import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

const allowed = new Set(['about','vision','mission','activity','project','portfolio','news','faq']);
const labels:Record<string,string>={about:'عن ASLAN',vision:'الرؤية',mission:'الرسالة',activity:'الأنشطة',project:'المشاريع',portfolio:'Portfolio',news:'الأخبار',faq:'الأسئلة الشائعة'};

export default async function CompanySection({params}:{params:Promise<{section:string}>}) {
  const {section}=await params;
  if(!allowed.has(section)) notFound();
  const db=await createClient();
  const {data}=await db.from('company_content').select('slug,title,excerpt,body,metadata').eq('content_type',section).eq('published',true).order('sort_order').order('published_at',{ascending:false});
  const items=data??[];
  return <main className="section"><div className="wrap"><Link href="/company">← الشركة</Link><span className="kicker" style={{display:'block',marginTop:24}}>ASLAN / {section.toUpperCase()}</span><h1 className="display">{labels[section]}</h1><div className="grid" style={{maxWidth:900,margin:'32px auto 0'}}>{items.length?items.map(item=><article className="card" key={item.slug}><h2>{item.title}</h2>{item.excerpt&&<p className="lead">{item.excerpt}</p>}<div style={{whiteSpace:'pre-wrap'}}>{item.body}</div></article>):<article className="card"><h2>لا يوجد محتوى منشور بعد.</h2><p>يمكن للإدارة إضافة هذا القسم من نظام المحتوى.</p></article>}</div></div></main>;
}
