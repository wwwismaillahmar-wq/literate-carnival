import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import LogoutButton from '@/components/LogoutButton';

const sections = [
  ['/', 'نظرة عامة', 'معلومات حسابك الأساسية وحالة الجلسة.', false],
  ['/account/profile', 'الملف الشخصي', 'إدارة معلوماتك الشخصية.', true],
  ['/account/security', 'الأمان', 'إعدادات كلمة المرور والجلسة.', true],
  ['/account/contributions', 'مساهماتي', 'انشر مساهمتك مباشرة، مع إمكانية إرفاق صورة أو فيديو.', false],
  ['/account/posts', 'منشوراتي', 'انشر مباشرة باختيار عام أو أصدقاء أو خاص، ثم أرفق صورة أو فيديو.', false],
  ['/account/friends', 'أصدقائي', 'إدارة علاقات الصداقة والأشخاص المقبولين.', false],
  ['/account/friend-requests', 'طلبات الصداقة', 'قبول أو رفض الطلبات الواردة.', false],
  ['/account/messages', 'رسائلي', 'المحادثات المباشرة بين الأصدقاء.', false],
  ['/account/orders', 'طلباتي', 'متابعة طلبات المنتجات.', true],
  ['/account/services', 'خدماتي', 'متابعة طلبات الخدمات.', true],
  ['/account/academy', 'الأكاديمية', 'الدورات والتكوينات المرتبطة بحسابك.', true],
  ['/account/talent', 'ملفي المهني', 'إدارة المهارات والأدلة المهنية وإرسالها للمراجعة.', false],
] as const;

export default async function AccountPage(){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) redirect('/login?next=/account');
  const {data:profile}=await supabase.from('profiles').select('full_name,role,created_at').eq('id',user.id).maybeSingle();
  return <main className="section" style={{minHeight:'70vh'}}><div className="wrap">
    <span className="kicker">ASLAN ACCOUNT</span><h1>حسابي</h1><p className="muted">بوابتك الشخصية داخل منظومة ASLAN.</p>
    <div className="card" style={{marginBottom:24}}><h2 style={{marginTop:0}}>{profile?.full_name||user.email||'مستخدم ASLAN'}</h2><p><strong>البريد الإلكتروني:</strong> {user.email||'—'}</p>{profile?.created_at&&<p className="muted">تاريخ إنشاء الحساب: {new Date(profile.created_at).toLocaleDateString('ar-DZ')}</p>}</div>
    <div className="card" style={{marginBottom:24,border:'1px solid var(--gold, #c9a227)'}}>
      <span className="kicker">M03 · النشر المباشر</span>
      <h2 style={{marginTop:8}}>انشر الآن دون انتظار المراجعة</h2>
      <p className="muted" style={{marginBottom:0}}>المنشورات والمساهمات الجديدة تُنشر مباشرة وفق مستوى الظهور الذي تختاره. يمكنك إرفاق صورة أو فيديو بعد النشر.</p>
    </div>
    <div className="grid three">{sections.map(([href,title,description,disabled])=>disabled?<article className="card" key={href} style={{opacity:.65}}><span className="kicker">قريبًا</span><h3>{title}</h3><p className="muted">{description}</p></article>:<Link className="card" href={href==='/'?'/account':href} key={href}><h3>{title}</h3><p className="muted">{description}</p><span className="gold">فتح القسم ↗</span></Link>)}</div>
    <div style={{marginTop:28}}><LogoutButton/></div>
  </div></main>;
}