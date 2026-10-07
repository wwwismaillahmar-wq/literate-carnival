import { redirect } from 'next/navigation';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import { createClient } from '@/lib/supabase/server';
import LogoutButton from '@/components/LogoutButton';
import {
  assignUserRole,
  deleteCategory,
  deleteProduct,
  removeUserRole,
  saveCategory,
  saveOrganization,
  savePermission,
  saveProduct,
  saveRole,
  updateContribution,
  updateLeadStatus,
  updatePost,
} from '../actions';

export const dynamic = 'force-dynamic';

type Product = { id:number; name:string; slug:string; description:string; price_dzd:number|null; stock:number; active:boolean; category_id:number|null };
type Category = { id:number; name:string; slug:string };
type Lead = { id:number; name:string; phone:string; type:string; status:string };
type Post = { id:string; title:string; status:string; featured:boolean };
type Contribution = { id:string; title:string; type:string; status:string; featured:boolean };
type Role = { id:string; key:string; name:string; description:string };
type Permission = { id:string; key:string; name:string; description:string };
type Profile = { id:string; username:string|null; full_name:string|null };
type UserRole = { user_id:string; role_id:string };

export default async function AdminControl() {
  const db = await createClient();
  const { data:{ user } } = await db.auth.getUser();
  if (!user) redirect('/admin/login');
  const { data:isSuperAdmin, error } = await db.rpc('has_role', { role_key:'super_admin' });
  if (error || !isSuperAdmin) redirect('/');

  const [
    {data:products},{data:categories},{data:leads},{data:posts},
    {data:contributions},{data:roles},{data:permissions},{data:profiles},{data:userRoles},{data:organizations}
  ] = await Promise.all([
    db.from('products').select('id,name,slug,description,price_dzd,stock,active,category_id').order('id'),
    db.from('categories').select('id,name,slug').order('id'),
    db.from('leads').select('id,name,phone,type,status').order('created_at',{ascending:false}).limit(30),
    db.from('posts').select('id,title,status,featured').order('created_at',{ascending:false}).limit(30),
    db.from('contributions').select('id,title,type,status,featured').order('created_at',{ascending:false}).limit(30),
    db.from('roles').select('id,key,name,description').order('name'),
    db.from('permissions').select('id,key,name,description').order('key'),
    db.from('profiles').select('id,username,full_name').order('created_at'),
    db.from('user_roles').select('user_id,role_id'),
    db.from('organizations').select('id,name,slug,type,status').order('name'),
  ]);

  return (
    <main className="section">
      <div className="wrap">
        <div style={{display:'flex',justifyContent:'space-between',gap:16,alignItems:'center',flexWrap:'wrap'}}>
          <div>
            <span className="kicker">ADMIN CONTROL CENTER / OPERATIONS</span>
            <h1>مركز التشغيل الإداري</h1>
            <p className="muted">هنا لا نعرض البيانات فقط؛ كل نموذج أدناه ينفذ تعديلًا حقيقيًا في النظام.</p>
          </div>
          <div style={{display:'flex',gap:10,alignItems:'center'}}>
            <Link className="card" href="/admin/dashboard">← لوحة التحكم</Link>
            <LogoutButton />
          </div>
        </div>

        <section className="card" style={{marginTop:25}}>
          <span className="kicker">COMMERCE</span><h2>المنتجات والفئات</h2>
          <div className="grid two" style={{marginTop:18}}>
            <div className="card">
              <h3>إضافة منتج</h3>
              <ProductForm categories={(categories??[]) as Category[]} action={saveProduct}/>
            </div>
            <div className="card">
              <h3>إضافة فئة</h3>
              <form action={saveCategory} style={formGrid}>
                <input name="name" placeholder="اسم الفئة" required />
                <input name="slug" placeholder="slug" required />
                <button type="submit">إنشاء الفئة</button>
              </form>
            </div>
          </div>
          <div style={{display:'grid',gap:12,marginTop:20}}>
            {(products??[] as Product[]).map((p:any)=>(
              <div className="card" key={p.id}>
                <ProductForm product={p} categories={(categories??[]) as Category[]} action={saveProduct}/>
                <form action={deleteProduct} style={{marginTop:8}}>
                  <input type="hidden" name="id" value={p.id}/>
                  <button type="submit">حذف المنتج</button>
                </form>
              </div>
            ))}
            {(categories??[] as Category[]).map((c:any)=>(
              <div className="card" key={'cat-'+c.id}>
                <form action={saveCategory} style={formGrid}>
                  <input type="hidden" name="id" value={c.id}/>
                  <input name="name" defaultValue={c.name} required />
                  <input name="slug" defaultValue={c.slug} required />
                  <button type="submit">حفظ الفئة</button>
                </form>
                <form action={deleteCategory} style={{marginTop:8}}>
                  <input type="hidden" name="id" value={c.id}/>
                  <button type="submit">حذف الفئة</button>
                </form>
              </div>
            ))}
          </div>
        </section>

        <section className="card" style={{marginTop:25}}>
          <span className="kicker">MARKET</span><h2>العملاء المحتملون</h2>
          <div style={{display:'grid',gap:12,marginTop:18}}>
            {(leads??[] as Lead[]).map((lead:any)=>(
              <form action={updateLeadStatus} className="card" key={lead.id} style={rowStyle}>
                <input type="hidden" name="id" value={lead.id}/>
                <div><strong>{lead.name || 'بدون اسم'}</strong><div className="muted">{lead.phone} · {lead.type}</div></div>
                <select name="status" defaultValue={lead.status}>
                  <option value="new">جديد</option><option value="contacted">تم التواصل</option><option value="qualified">مؤهل</option><option value="closed">مغلق</option>
                </select>
                <button type="submit">حفظ</button>
              </form>
            ))}
          </div>
        </section>

        <section className="card" style={{marginTop:25}}>
          <span className="kicker">CONTENT / MODERATION</span><h2>المنشورات والمساهمات</h2>
          <div className="grid two" style={{marginTop:18}}>
            <div>
              <h3>المنشورات</h3>
              {(posts??[] as Post[]).map((post:any)=>(
                <form action={updatePost} className="card" key={post.id} style={stackStyle}>
                  <input type="hidden" name="id" value={post.id}/>
                  <strong>{post.title}</strong>
                  <select name="status" defaultValue={post.status}>
                    {['draft','pending','needs_revision','accepted','published','rejected','archived'].map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                  <label><input type="checkbox" name="featured" defaultChecked={post.featured}/> مميز</label>
                  <button type="submit">حفظ</button>
                </form>
              ))}
            </div>
            <div>
              <h3>المساهمات</h3>
              {(contributions??[] as Contribution[]).map((item:any)=>(
                <form action={updateContribution} className="card" key={item.id} style={stackStyle}>
                  <input type="hidden" name="id" value={item.id}/>
                  <strong>{item.title}</strong><div className="muted">{item.type}</div>
                  <select name="status" defaultValue={item.status}>
                    {['pending','needs_revision','accepted','published','rejected'].map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                  <label><input type="checkbox" name="featured" defaultChecked={item.featured}/> مميز</label>
                  <button type="submit">حفظ</button>
                </form>
              ))}
            </div>
          </div>
        </section>

        <section className="card" style={{marginTop:25}}>
          <span className="kicker">IDENTITY / RBAC</span><h2>الأدوار والصلاحيات والمستخدمون</h2>
          <div className="grid three" style={{marginTop:18}}>
            <div className="card">
              <h3>إنشاء دور</h3>
              <form action={saveRole} style={formGrid}>
                <input name="key" placeholder="role_key" required pattern="[a-z][a-z0-9_]*"/>
                <input name="name" placeholder="اسم الدور" required/>
                <textarea name="description" placeholder="الوصف"/>
                <button type="submit">إنشاء</button>
              </form>
              <div style={{display:'grid',gap:8,marginTop:14}}>
                {(roles??[] as Role[]).map((r:any)=><form action={saveRole} key={r.id} style={formGrid}>
                  <input type="hidden" name="id" value={r.id}/>
                  <input name="key" defaultValue={r.key} required/>
                  <input name="name" defaultValue={r.name} required/>
                  <textarea name="description" defaultValue={r.description}/>
                  <button type="submit">حفظ {r.name}</button>
                </form>)}
              </div>
            </div>
            <div className="card">
              <h3>إضافة صلاحية</h3>
              <form action={savePermission} style={formGrid}>
                <input name="key" placeholder="module.action" required pattern="[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*"/>
                <input name="name" placeholder="اسم الصلاحية" required/>
                <textarea name="description" placeholder="الوصف"/>
                <button type="submit">حفظ الصلاحية</button>
              </form>
              <div style={{display:'grid',gap:6,marginTop:14}}>
                {(permissions??[] as Permission[]).map((p:any)=><div key={p.id}><strong>{p.key}</strong><div className="muted">{p.name}</div></div>)}
              </div>
            </div>
            <div className="card">
              <h3>تعيين دور لمستخدم</h3>
              <form action={assignUserRole} style={formGrid}>
                <select name="user_id" required>{(profiles??[] as Profile[]).map((p:any)=><option key={p.id} value={p.id}>{p.full_name || p.username || p.id}</option>)}</select>
                <select name="role_id" required>{(roles??[] as Role[]).map((r:any)=><option key={r.id} value={r.id}>{r.name} ({r.key})</option>)}</select>
                <button type="submit">تعيين الدور</button>
              </form>
              <div style={{display:'grid',gap:8,marginTop:14}}>
                {(userRoles??[] as UserRole[]).map((ur:any)=>{
                  const profile=(profiles??[] as Profile[]).find((p:any)=>p.id===ur.user_id);
                  const role=(roles??[] as Role[]).find((r:any)=>r.id===ur.role_id);
                  return <form action={removeUserRole} key={ur.user_id+'-'+ur.role_id} style={rowStyle}>
                    <input type="hidden" name="user_id" value={ur.user_id}/><input type="hidden" name="role_id" value={ur.role_id}/>
                    <span>{profile?.full_name || profile?.username || ur.user_id} → {role?.name || ur.role_id}</span><button type="submit">إزالة</button>
                  </form>
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="card" style={{marginTop:25}}>
          <span className="kicker">ORGANIZATIONS</span><h2>المؤسسات</h2>
          <form action={saveOrganization} style={formGrid}>
            <input name="name" placeholder="اسم المؤسسة" required/>
            <input name="slug" placeholder="slug" required/>
            <select name="type"><option value="company">شركة</option><option value="academy">أكاديمية</option><option value="partner">شريك</option><option value="internal">داخلية</option><option value="community">مجتمع</option></select>
            <select name="status"><option value="active">نشطة</option><option value="suspended">موقوفة</option><option value="archived">مؤرشفة</option></select>
            <button type="submit">إنشاء مؤسسة</button>
          </form>
          <div style={{display:'grid',gap:10,marginTop:18}}>
            {(organizations??[] as any[]).map((o:any)=><form action={saveOrganization} className="card" key={o.id} style={rowStyle}>
              <input type="hidden" name="id" value={o.id}/>
              <input name="name" defaultValue={o.name} required/><input name="slug" defaultValue={o.slug} required/>
              <select name="type" defaultValue={o.type}><option value="company">شركة</option><option value="academy">أكاديمية</option><option value="partner">شريك</option><option value="internal">داخلية</option><option value="community">مجتمع</option></select>
              <select name="status" defaultValue={o.status}><option value="active">نشطة</option><option value="suspended">موقوفة</option><option value="archived">مؤرشفة</option></select>
              <button type="submit">حفظ</button>
            </form>)}
          </div>
        </section>
      </div>
    </main>
  );
}

function ProductForm({product,categories,action}:{product?:Product;categories:Category[];action:(formData:FormData)=>Promise<void>}) {
  return <form action={action} style={formGrid}>
    {product && <input type="hidden" name="id" value={product.id}/>}
    <input name="name" defaultValue={product?.name} placeholder="اسم المنتج" required/>
    <input name="slug" defaultValue={product?.slug} placeholder="slug" required/>
    <textarea name="description" defaultValue={product?.description} placeholder="الوصف"/>
    <input name="price_dzd" type="number" min="0" defaultValue={product?.price_dzd ?? ''} placeholder="السعر بالدينار"/>
    <input name="stock" type="number" min="0" defaultValue={product?.stock ?? 0} placeholder="المخزون"/>
    <select name="category_id" defaultValue={product?.category_id?.toString() ?? ''}><option value="">بدون فئة</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
    <label><input type="checkbox" name="active" defaultChecked={product?.active ?? true}/> نشط</label>
    <button type="submit">{product ? 'حفظ المنتج' : 'إنشاء المنتج'}</button>
  </form>;
}

const formGrid: CSSProperties = {display:'grid',gap:10};
const rowStyle: CSSProperties = {display:'grid',gridTemplateColumns:'minmax(0,1fr) auto auto',gap:10,alignItems:'center'};
const stackStyle: CSSProperties = {display:'grid',gap:10,marginBottom:10};
