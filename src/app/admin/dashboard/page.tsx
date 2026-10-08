import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import LogoutButton from '@/components/LogoutButton';
import { ADMIN_APPLICATIONS } from '../applications';

export const dynamic = 'force-dynamic';

type Row = Record<string, unknown>;

export default async function Dashboard() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/admin/login');

  const [{ data: profile }, { data: isSuperAdmin, error: authorizationError }] =
    await Promise.all([
      db.from('profiles').select('full_name,username').eq('id', user.id).maybeSingle(),
      db.rpc('has_role', { role_key: 'super_admin' }),
    ]);

  if (authorizationError || !isSuperAdmin) redirect('/');

  const [
    { count: users }, { count: roles }, { count: permissions }, { count: organizations },
    { count: products }, { count: categories }, { count: leads }, { count: posts },
    { count: contributions }, { count: conversations }, { count: messages }, { count: gallery },
  ] = await Promise.all([
    db.from('profiles').select('*', { count: 'exact', head: true }),
    db.from('roles').select('*', { count: 'exact', head: true }),
    db.from('permissions').select('*', { count: 'exact', head: true }),
    db.from('organizations').select('*', { count: 'exact', head: true }),
    db.from('products').select('*', { count: 'exact', head: true }),
    db.from('categories').select('*', { count: 'exact', head: true }),
    db.from('leads').select('*', { count: 'exact', head: true }),
    db.from('posts').select('*', { count: 'exact', head: true }),
    db.from('contributions').select('*', { count: 'exact', head: true }),
    db.from('conversations').select('*', { count: 'exact', head: true }),
    db.from('messages').select('*', { count: 'exact', head: true }),
    db.from('work_gallery').select('*', { count: 'exact', head: true }),
  ]);

  const [{ data: recentPosts }, { data: recentContributions }, { data: recentLeads }] =
    await Promise.all([
      db.from('posts').select('id,title,status,created_at').order('created_at', { ascending: false }).limit(5),
      db.from('contributions').select('id,title,type,status,created_at').order('created_at', { ascending: false }).limit(5),
      db.from('leads').select('id,name,type,status,created_at').order('created_at', { ascending: false }).limit(5),
    ]);

  const statGroups = [
    { title: 'الهوية والصلاحيات', items: [['المستخدمون', users], ['الأدوار', roles], ['الصلاحيات', permissions], ['المؤسسات', organizations]] },
    { title: 'التجارة والسوق', items: [['المنتجات', products], ['الفئات', categories], ['العملاء المحتملون', leads], ['المعرض', gallery]] },
    { title: 'المجتمع والمراسلة', items: [['المنشورات', posts], ['المساهمات', contributions], ['المحادثات', conversations], ['الرسائل', messages]] },
  ];

  return (
    <main className="section"><div className="wrap">
      <div style={{display:'flex',justifyContent:'space-between',gap:16,alignItems:'center',flexWrap:'wrap'}}>
        <div><span className="kicker">ADMIN CONTROL CENTER</span><h1>مركز تحكم ASLAN</h1><p className="muted">{profile?.full_name || profile?.username || user.email}</p><p className="muted">جلسة الإدارة تبقى فعالة أثناء تصفح الموقع والمعاينة.</p></div>
        <div style={{display:'flex',gap:10,alignItems:'center'}}>
          <Link href="/admin/control" className="card" style={{textDecoration:'none'}}>⚙️ مركز التشغيل</Link><Link href="/" className="card" style={{textDecoration:'none'}}>👁️ معاينة الموقع</Link><LogoutButton />
        </div>
      </div>

      <section className="card" style={{marginTop:25}}>
        <span className="kicker">OPERATIONS / M00–M17</span>
        <h2>خريطة التشغيل الفعلية</h2>
        <p className="muted">هذه ليست مراحل نظرية: كل بطاقة أدناه تقود إلى واجهة التشغيل الموجودة فعليًا. الحدود التي ما زالت بنيوية فقط تبقى معلّمة بوضوح بدل إظهارها كأنها مكتملة.</p>
        <div className="grid three" style={{marginTop:18}}>
          {[
            ['/admin/control','M04 / الإدارة المركزية','المنتجات، العملاء المحتملون، المحتوى، RBAC، المستخدمون والمؤسسات','active'],
            ['/admin/audit','M09 / التدقيق','سجل العمليات الإدارية والتغييرات','active'],
            ['/admin/company','M09 / محتوى الشركة','إدارة عن ASLAN والرؤية والرسالة والمشاريع والأخبار','active'],
            ['/admin/content','M11 / المحتوى المميز','إدارة المحتوى المميز والظهور','active'],
            ['/admin/market','M12 / السوق','الكتالوج والتصنيفات والعملاء المحتملون','active'],
            ['/admin/inventory','M13 / المخزون','المخزون والحركات والحجز','active'],
            ['/admin/fulfillment','M13 / التنفيذ والتسليم','مهام التنفيذ والتتبع','active'],
            ['/cart','M14 / السلة','سلة العميل الحالية','active'],
            ['/checkout','M14 / Checkout','تثبيت الطلب والحجز وإنشاء الفاتورة','active'],
            ['/orders','M14 / الطلبات','طلبات العميل','active'],
            ['/invoices','M15 / الفواتير','الفوترة وسجل الفواتير','active'],
            ['/admin/payments','M15 / تشغيل المدفوعات','طلبات الدفع والتأكيد اليدوي وتحديث الفواتير','active'],
            ['/services','M16 / الخدمات','كتالوج الخدمات ومسار الطلب','active'],
            ['/service-requests','M16 / طلبات الخدمة','طلبات الخدمة وحالاتها','active'],
            ['/admin/services','M17 / تشغيل الخدمات','آلة حالات تشغيل الخدمات','active'],
          ].map(([href,title,detail,status]) => (
            <Link href={href} key={href} className="card" style={{textDecoration:'none'}}>
              <span className="kicker">{status}</span><h3>{title}</h3><p className="muted">{detail}</p>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid three" style={{marginTop:25}}>
        {statGroups.flatMap(group => group.items.map(([label, value]) => (
          <div className="card" key={label as string}><span className="kicker">{group.title}</span><h2>{value ?? 0}</h2><p className="muted">{label}</p></div>
        )))}
      </div>

      <section className="card" style={{marginTop:25}}>
        <span className="kicker">APPLICATIONS / EXTENSIONS</span><h2>تطبيقات المنصة</h2>
        <p className="muted">سجل مركزي قابل للتوسع للتطبيقات المستقبلية. لا يوجد تشغيل ديناميكي لإضافات غير موثوقة؛ كل تطبيق يمر عبر الصلاحيات الحالية.</p>
        <div className="grid three" style={{marginTop:20}}>{ADMIN_APPLICATIONS.map(app =>
          <div className="card" key={app.id}><strong>{app.name}</strong><p className="muted">{app.description}</p><small>{app.status}</small></div>
        )}</div>
      </section>

      <section className="grid three" style={{marginTop:25}}>
        <AdminTable title="آخر العملاء المحتملين" rows={(recentLeads ?? []) as Row[]} fields={['name','type','status']} />
        <AdminTable title="آخر المنشورات" rows={(recentPosts ?? []) as Row[]} fields={['title','status']} />
        <AdminTable title="آخر المساهمات" rows={(recentContributions ?? []) as Row[]} fields={['title','type','status']} />
      </section>

      <section className="card" style={{marginTop:25}}>
        <span className="kicker">CONTROL MAP</span><h2>حدود الإدارة الحالية</h2>
        <div className="grid three" style={{marginTop:20}}>{[
          ['Users & Identity','profiles + roles + permissions'],['Organizations','organizations + members'],
          ['Commerce','products + categories + leads'],['Content','posts + contributions + moderation'],
          ['Messaging','conversations + messages'],['Media','media assets + work gallery'],
          ['Services','حد معماري — لم يُفعّل كنظام مستقل بعد'],['Academy','حد معماري — لم يُفعّل كنظام LMS بعد'],
          ['Talent / Partners','حدود معمارية — التفعيل لاحقًا'],
        ].map(([name, detail]) => <div className="card" key={name}><strong>{name}</strong><p className="muted">{detail}</p></div>)}</div>
      </section>
    </div></main>
  );
}

function AdminTable({title,rows,fields}:{title:string;rows:Row[];fields:string[]}) {
  return <div className="card"><span className="kicker">LIVE DATA</span><h2>{title}</h2>
    {rows.length===0 ? <p className="muted">لا توجد سجلات.</p> :
      <div style={{display:'grid',gap:12,marginTop:15}}>{rows.map((row,index)=>
        <div key={String(row.id ?? index)} style={{paddingBottom:10,borderBottom:'1px solid rgba(255,255,255,.08)'}}>
          {fields.map(field=><div key={field}><small className="muted">{field}</small>{' '}<span>{String(row[field] ?? '—')}</span></div>)}
        </div>)}</div>}
  </div>;
}
