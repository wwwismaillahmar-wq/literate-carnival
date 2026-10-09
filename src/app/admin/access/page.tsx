import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { assignRolePermission, assignUserRole, removeRolePermission, removeUserRole, savePermission, saveRole, updateAdminProfile } from '../actions';

export const dynamic = 'force-dynamic';

type Role = { id: string; key: string; name: string; description: string | null };
type Permission = { id: string; key: string; name: string; description: string | null };
type Profile = { id: string; username: string | null; full_name: string | null; message_privacy: string };
type UserRole = { user_id: string; role_id: string };
type RolePermission = { role_id: string; permission_id: string };

export default async function AdminAccess({ searchParams }: { searchParams?: Promise<{ success?: string; error?: string }> }) {
  const params = searchParams ? await searchParams : {};
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/admin/login');
  const { data: isSuperAdmin, error: authError } = await db.rpc('has_role', { role_key: 'super_admin' });
  if (authError || isSuperAdmin !== true) redirect('/');

  const [rolesResult, permissionsResult, profilesResult, userRolesResult, rolePermissionsResult] = await Promise.all([
    db.from('roles').select('id,key,name,description').order('name'),
    db.from('permissions').select('id,key,name,description').order('key'),
    db.from('profiles').select('id,username,full_name,message_privacy').order('created_at'),
    db.from('user_roles').select('user_id,role_id'),
    db.from('role_permissions').select('role_id,permission_id'),
  ]);
  const roles = (rolesResult.data ?? []) as Role[];
  const permissions = (permissionsResult.data ?? []) as Permission[];
  const profiles = (profilesResult.data ?? []) as Profile[];
  const userRoles = (userRolesResult.data ?? []) as UserRole[];
  const rolePermissions = (rolePermissionsResult.data ?? []) as RolePermission[];

  return <main className="section"><div className="wrap">
    <div style={{display:'flex',justifyContent:'space-between',gap:16,alignItems:'center',flexWrap:'wrap'}}>
      <div><span className="kicker">M04 / IDENTITY & RBAC</span><h1>إدارة الوصول والصلاحيات</h1><p className="muted">إدارة الأدوار والصلاحيات والمستخدمين وربط الأدوار بالمستخدمين وبالصلاحيات.</p></div>
      <Link className="card" href="/admin/control">بوابة الإدارة</Link>
    </div>
    {params.success && <div className="card" style={{marginTop:16,border:'1px solid #2f855a'}}><strong>✓ {params.success}</strong></div>}
    {params.error && <div className="card" style={{marginTop:16,border:'1px solid #c53030'}}><strong>✕ {params.error}</strong></div>}
    {[rolesResult.error,permissionsResult.error,profilesResult.error,userRolesResult.error,rolePermissionsResult.error].some(Boolean) && <div className="card" style={{marginTop:16,border:'1px solid #c53030'}}><strong>تعذر تحميل بعض بيانات الصلاحيات.</strong><p className="muted">{[rolesResult.error?.message,permissionsResult.error?.message,profilesResult.error?.message,userRolesResult.error?.message,rolePermissionsResult.error?.message].filter(Boolean).join(' · ')}</p></div>}

    <div className="grid two" style={{marginTop:24}}>
      <section className="card"><h2>الأدوار ({roles.length})</h2>
        <form action={saveRole} style={{display:'grid',gap:10,marginTop:12}}>
          <label>مفتاح الدور<input name="key" required pattern="[a-z][a-z0-9_]*" placeholder="market_manager"/></label>
          <label>اسم الدور<input name="name" required/></label><label>الوصف<textarea name="description" rows={2}/></label><button type="submit">إنشاء الدور</button>
        </form>
        <div style={{display:'grid',gap:12,marginTop:16}}>{roles.map((role)=><form action={saveRole} className="card" key={role.id} style={{display:'grid',gap:8}}>
          <input type="hidden" name="id" value={role.id}/><label>المفتاح<input name="key" defaultValue={role.key} required pattern="[a-z][a-z0-9_]*"/></label><label>الاسم<input name="name" defaultValue={role.name} required/></label><label>الوصف<textarea name="description" defaultValue={role.description ?? ''} rows={2}/></label><button type="submit">حفظ الدور</button>
        </form>)}</div>
      </section>

      <section className="card"><h2>الصلاحيات ({permissions.length})</h2>
        <form action={savePermission} style={{display:'grid',gap:10,marginTop:12}}>
          <label>المفتاح بصيغة module.action<input name="key" required pattern="[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*" placeholder="market.edit"/></label><label>اسم الصلاحية<input name="name" required/></label><label>الوصف<textarea name="description" rows={2}/></label><button type="submit">حفظ الصلاحية</button>
        </form>
        <div style={{display:'grid',gap:8,marginTop:16}}>{permissions.map((permission)=><div className="card" key={permission.id}><strong>{permission.key}</strong><p className="muted">{permission.name}</p></div>)}</div>
      </section>
    </div>

    <section style={{marginTop:28}}><h2>تعيين الأدوار للمستخدمين ({userRoles.length} ربط)</h2>
      <form action={assignUserRole} className="card" style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr)) auto',gap:10,marginTop:12,alignItems:'end'}}>
        <label>المستخدم<select name="user_id" required>{profiles.map((profile)=><option key={profile.id} value={profile.id}>{profile.full_name || profile.username || profile.id}</option>)}</select></label>
        <label>الدور<select name="role_id" required>{roles.map((role)=><option key={role.id} value={role.id}>{role.name} ({role.key})</option>)}</select></label>
        <span className="muted">حافظ على وجود Super Admin واحد على الأقل.</span><button type="submit">تعيين الدور</button>
      </form>
      <div className="grid two" style={{marginTop:14}}>{userRoles.map((item)=><form action={removeUserRole} className="card" key={item.user_id+'-'+item.role_id} style={{display:'flex',justifyContent:'space-between',gap:10,alignItems:'center',flexWrap:'wrap'}}>
        <input type="hidden" name="user_id" value={item.user_id}/><input type="hidden" name="role_id" value={item.role_id}/>
        <span>{profiles.find((p)=>p.id===item.user_id)?.full_name || profiles.find((p)=>p.id===item.user_id)?.username || item.user_id} ← {roles.find((r)=>r.id===item.role_id)?.name || item.role_id}</span><button type="submit">إزالة الدور</button>
      </form>)}</div>
    </section>

    <section style={{marginTop:28}}><h2>صلاحيات كل دور</h2><div className="grid two" style={{marginTop:14}}>{roles.map((role)=><article className="card" key={role.id}>
      <h3>{role.name}</h3><p className="muted">{role.key}</p>
      <form action={assignRolePermission} style={{display:'grid',gap:8}}><input type="hidden" name="role_id" value={role.id}/><label>إضافة صلاحية<select name="permission_id" required>{permissions.map((permission)=><option key={permission.id} value={permission.id}>{permission.key} — {permission.name}</option>)}</select></label><button type="submit" disabled={!permissions.length}>ربط الصلاحية</button></form>
      <div style={{display:'grid',gap:8,marginTop:12}}>{rolePermissions.filter((item)=>item.role_id===role.id).map((item)=><form action={removeRolePermission} key={item.permission_id} style={{display:'flex',justifyContent:'space-between',gap:8,alignItems:'center'}}><input type="hidden" name="role_id" value={role.id}/><input type="hidden" name="permission_id" value={item.permission_id}/><span>{permissions.find((p)=>p.id===item.permission_id)?.key ?? item.permission_id}</span><button type="submit">إزالة</button></form>)}</div>
    </article>)}</div></section>

    <section style={{marginTop:28}}><h2>ملفات المستخدمين ({profiles.length})</h2><div className="grid two" style={{marginTop:14}}>{profiles.map((profile)=><form action={updateAdminProfile} className="card" key={profile.id} style={{display:'grid',gap:10}}>
      <input type="hidden" name="id" value={profile.id}/><strong>{profile.full_name || profile.username || profile.id}</strong><label>الاسم الكامل<input name="full_name" defaultValue={profile.full_name ?? ''}/></label><label>اسم المستخدم<input name="username" defaultValue={profile.username ?? ''}/></label>
      <label>خصوصية الرسائل<select name="message_privacy" defaultValue={profile.message_privacy ?? 'all_members'}><option value="members_only">الأعضاء فقط</option><option value="all_members">كل الأعضاء</option><option value="community">المجتمع</option><option value="friends">الأصدقاء</option></select></label><button type="submit">حفظ الملف</button>
    </form>)}</div></section>
  </div></main>;
}
