import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { removeOrganizationMember, saveOrganization, saveOrganizationMember } from '../actions';

export const dynamic = 'force-dynamic';

type Organization = { id: string; name: string; slug: string; type: string; status: string };
type Profile = { id: string; username: string | null; full_name: string | null };
type Role = { id: string; key: string; name: string };
type Member = { organization_id: string; user_id: string; role_id: string; status: string };

const types = [['company','شركة'],['academy','أكاديمية'],['partner','شريك'],['internal','داخلية'],['community','مجتمع']];
const statuses = [['active','نشطة'],['suspended','موقوفة'],['archived','مؤرشفة']];

export default async function AdminOrganizations({ searchParams }: { searchParams?: Promise<{ success?: string; error?: string }> }) {
  const params = searchParams ? await searchParams : {};
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/admin/login');
  const { data: isSuperAdmin, error: authError } = await db.rpc('has_role', { role_key: 'super_admin' });
  if (authError || isSuperAdmin !== true) redirect('/');

  const [orgResult, profileResult, roleResult, memberResult] = await Promise.all([
    db.from('organizations').select('id,name,slug,type,status').order('name'),
    db.from('profiles').select('id,username,full_name').order('full_name'),
    db.from('roles').select('id,key,name').order('name'),
    db.from('organization_members').select('organization_id,user_id,role_id,status'),
  ]);
  const organizations = (orgResult.data ?? []) as Organization[];
  const profiles = (profileResult.data ?? []) as Profile[];
  const roles = (roleResult.data ?? []) as Role[];
  const members = (memberResult.data ?? []) as Member[];

  return <main className="section"><div className="wrap">
    <div style={{display:'flex',justifyContent:'space-between',gap:16,alignItems:'center',flexWrap:'wrap'}}><div><span className="kicker">M04 / ORGANIZATIONS</span><h1>المؤسسات والعضويات</h1><p className="muted">إنشاء المؤسسات وتعديل حالتها وربط المستخدمين بأدوار داخل كل مؤسسة.</p></div><Link className="card" href="/admin/control">بوابة الإدارة</Link></div>
    {params.success && <div className="card" style={{marginTop:16,border:'1px solid #2f855a'}}><strong>✓ {params.success}</strong></div>}
    {params.error && <div className="card" style={{marginTop:16,border:'1px solid #c53030'}}><strong>✕ {params.error}</strong></div>}
    {[orgResult.error,profileResult.error,roleResult.error,memberResult.error].some(Boolean) && <div className="card" style={{marginTop:16,border:'1px solid #c53030'}}><strong>تعذر تحميل بعض بيانات المؤسسات.</strong><p>{[orgResult.error?.message,profileResult.error?.message,roleResult.error?.message,memberResult.error?.message].filter(Boolean).join(' · ')}</p></div>}

    <section className="card" style={{marginTop:24}}><h2>إنشاء مؤسسة</h2><form action={saveOrganization} style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:10,marginTop:12}}>
      <label>اسم المؤسسة<input name="name" required/></label><label>الرابط المختصر<input name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*"/></label>
      <label>النوع<select name="type">{types.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><label>الحالة<select name="status">{statuses.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
      <button type="submit" style={{gridColumn:'1/-1'}}>إنشاء المؤسسة</button>
    </form></section>

    <section style={{marginTop:28}}><h2>المؤسسات ({organizations.length})</h2><div className="grid two" style={{marginTop:14}}>{organizations.map((org)=><form action={saveOrganization} className="card" key={org.id} style={{display:'grid',gap:10}}>
      <input type="hidden" name="id" value={org.id}/><label>الاسم<input name="name" defaultValue={org.name} required/></label><label>الرابط المختصر<input name="slug" defaultValue={org.slug} required pattern="[a-z0-9]+(-[a-z0-9]+)*"/></label>
      <label>النوع<select name="type" defaultValue={org.type}>{types.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><label>الحالة<select name="status" defaultValue={org.status}>{statuses.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><button type="submit">حفظ المؤسسة</button>
    </form>)}</div></section>

    <section style={{marginTop:28}}><h2>إضافة أو تعديل عضوية</h2><form action={saveOrganizationMember} className="card" style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:10,marginTop:12,alignItems:'end'}}>
      <label>المؤسسة<select name="organization_id" required>{organizations.map((org)=><option key={org.id} value={org.id}>{org.name}</option>)}</select></label>
      <label>المستخدم<select name="user_id" required>{profiles.map((profile)=><option key={profile.id} value={profile.id}>{profile.full_name || profile.username || profile.id}</option>)}</select></label>
      <label>الدور<select name="role_id" required>{roles.map((role)=><option key={role.id} value={role.id}>{role.name} ({role.key})</option>)}</select></label>
      <label>الحالة<select name="status" defaultValue="active"><option value="active">نشط</option><option value="invited">مدعو</option><option value="suspended">موقوف</option><option value="removed">مزال</option></select></label>
      <button type="submit" style={{gridColumn:'1/-1'}} disabled={!organizations.length || !profiles.length || !roles.length}>حفظ العضوية</button>
    </form></section>

    <section style={{marginTop:28}}><h2>العضويات الحالية ({members.length})</h2><div className="grid two" style={{marginTop:14}}>{members.map((member)=><form action={removeOrganizationMember} className="card" key={member.organization_id+'-'+member.user_id} style={{display:'flex',justifyContent:'space-between',gap:10,alignItems:'center',flexWrap:'wrap'}}>
      <input type="hidden" name="organization_id" value={member.organization_id}/><input type="hidden" name="user_id" value={member.user_id}/>
      <span>{organizations.find((org)=>org.id===member.organization_id)?.name || member.organization_id} → {profiles.find((profile)=>profile.id===member.user_id)?.full_name || profiles.find((profile)=>profile.id===member.user_id)?.username || member.user_id} → {roles.find((role)=>role.id===member.role_id)?.name || member.role_id} · {member.status}</span>
      <button type="submit">إزالة العضوية</button>
    </form>)}</div></section>
  </div></main>;
}
