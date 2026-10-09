import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { LeadActivityPanel } from '@/components/admin/LeadActivityPanel';
import { LeadStatusControl } from '@/components/admin/LeadStatusControl';

export const dynamic = 'force-dynamic';

type Lead = { id: number; type: string; name: string; phone: string; message: string; status: string; assigned_to: string | null; updated_at: string; created_at: string };
type UserOption = { id: string; full_name: string | null; username: string | null };

export default async function AdminCrmPage() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/admin/login');
  const { data: allowed, error: authError } = await db.rpc('has_role', { role_key: 'super_admin' });
  if (authError || allowed !== true) redirect('/');
  const [{ data, error }, { data: userRows, error: usersError }] = await Promise.all([
    db.from('leads').select('id,type,name,phone,message,status,assigned_to,updated_at,created_at').order('created_at', { ascending: false }).limit(100),
    db.from('profiles').select('id,full_name,username').order('full_name').limit(500),
  ]);
  const leads = (data ?? []) as Lead[];
  const users = (userRows ?? []) as UserOption[];

  return <main className="section"><div className="wrap">
    <Link href="/admin/control">← مركز التحكم</Link>
    <span className="kicker" style={{ display: 'block', marginTop: 24 }}>CRM / M38</span>
    <h1>إدارة علاقات العملاء</h1>
    <p className="muted">متابعة العملاء المحتملين مع سجل زمني للمكالمات والملاحظات والبريد وواتساب والمواعيد. سجل المتابعة منفصل عن بيانات العميل ولا يستبدل حالة الطلب الأصلية.</p>
    {(error || usersError) && <div className="card" role="alert">تعذر تحميل العملاء أو قائمة المسؤولين. لم تُعرض القائمة على أنها فارغة. {(error || usersError)?.message}</div>}
    {!error && !leads.length && <div className="card">لا توجد سجلات عملاء محتملين.</div>}
    <section className="grid two" style={{ marginTop: 20 }}>
      {leads.map(lead => <article className="card" key={lead.id}>
        <span className="kicker">{lead.type} · {lead.status}</span>
        <h2>{lead.name}</h2>
        <p><a href={'tel:' + lead.phone}>{lead.phone}</a></p>
        <p className="muted">{lead.message}</p>
        <small className="muted">تاريخ الطلب: {new Date(lead.created_at).toLocaleString('ar-DZ')}</small>
        <LeadStatusControl lead={lead} users={users} />
        <LeadActivityPanel leadId={lead.id} />
      </article>)}
    </section>
  </div></main>;
}
