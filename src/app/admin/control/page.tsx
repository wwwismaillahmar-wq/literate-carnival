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
  deleteProductMedia,
  saveRole,
  updateAdminProfile,
  assignRolePermission,
  removeRolePermission,
  updateContribution,
  updateLeadStatus,
  updatePost,
  saveOrganizationMember,
  removeOrganizationMember,
  savePaymentProviderConfig,
} from '../actions';

export const dynamic = 'force-dynamic';

type Product = { id:number; name:string; slug:string; description:string; price_dzd:number|null; stock:number; active:boolean; category_id:number|null; ad_priority:number; home_featured:boolean };
type Category = { id:number; name:string; slug:string };
type Lead = { id:number; name:string; phone:string; type:string; status:string };
type Post = { id:string; title:string; status:string; featured:boolean };
type Contribution = { id:string; title:string; type:string; status:string; featured:boolean };
type Role = { id:string; key:string; name:string; description:string };
type Permission = { id:string; key:string; name:string; description:string };
type Profile = { id:string; username:string|null; full_name:string|null };
type UserRole = { user_id:string; role_id:string };
type Organization = { id:string; name:string; slug:string; type:string; status:string };
type OrganizationMember = { organization_id:string; user_id:string; role_id:string; status:string };
type RolePermission = { role_id:string; permission_id:string };
type ProductMedia = { id:string; product_id:number; media_type:string; mime_type:string; file_size:number; object_path:string; bucket_id:string; url:string|null };
type PaymentProvider = { id:string; provider_key:string; display_name:string; enabled:boolean; mode:string; config_data:Record<string,unknown>|null };

export default async function AdminControl({ searchParams }: { searchParams?: Promise<{ success?: string; error?: string }> }) {
  const params = searchParams ? await searchParams : {};

  const db = await createClient();
  const { data:{ user } } = await db.auth.getUser();
  if (!user) redirect('/admin/login');
  const { data:isSuperAdmin, error } = await db.rpc('has_role', { role_key:'super_admin' });
  if (error || !isSuperAdmin) redirect('/');

  const [
    {data:products},{data:categories},{data:leads},{data:posts},
    {data:contributions},{data:roles},{data:permissions},{data:profiles},{data:userRoles},{data:organizations},{data:rolePermissions},{data:organizationMembers}
  ] = await Promise.all([
    db.from('products').select('id,name,slug,description,price_dzd,stock,active,category_id,ad_priority,home_featured').order('id'),
    db.from('categories').select('id,name,slug').order('id'),
    db.from('leads').select('id,name,phone,type,status').order('created_at',{ascending:false}).limit(30),
    db.from('posts').select('id,title,status,featured').order('created_at',{ascending:false}).limit(30),
    db.from('contributions').select('id,title,type,status,featured').order('created_at',{ascending:false}).limit(30),
    db.from('roles').select('id,key,name,description').order('name'),
    db.from('permissions').select('id,key,name,description').order('key'),
    db.from('profiles').select('id,username,full_name').order('created_at'),
    db.from('user_roles').select('user_id,role_id'),
    db.from('organizations').select('id,name,slug,type,status').order('name'),
    db.from('role_permissions').select('role_id,permission_id'),
    db.from('organization_members').select('organization_id,user_id,role_id,status'),
  ]);

  const { data: paymentProviders } = await db.from('payment_provider_configs').select('id,provider_key,display_name,enabled,mode,config_data').order('sort_order').order('display_name');

  const { data: rawProductMedia } = await db.from('media_assets').select('id,product_id,media_type,mime_type,file_size,object_path,bucket_id').not('product_id','is',null).order('created_at',{ascending:false});
  const productMedia = await Promise.all((rawProductMedia ?? []).map(async (media:Omit<ProductMedia,'url'>) => {
    const { data } = await db.storage.from(media.bucket_id ?? 'aslan-media').createSignedUrl(media.object_path, 3600);
    return { ...media, url: data?.signedUrl ?? null } as ProductMedia;
  }));

  return (
    <main className="section">
      <div className="wrap">
        <div style={{display:'flex',justifyContent:'space-between',gap:16,alignItems:'center',flexWrap:'wrap'}}>
          <div>
            {params.success && <div className="card" style={{marginBottom:14,border:"1px solid rgba(212,175,55,.45)"}}><strong>✓ {params.success}</strong></div>}
            {params.error && <div className="card" style={{marginBottom:14,border:"1px solid rgba(220,80,80,.55)"}}><strong>✕ {params.error}</strong></div>}
            <span className="kicker">ADMIN CONTROL CENTER / OPERATIONS</span>
            <h1>مركز التشغيل الإداري</h1>
            <p className="muted">هنا لا نعرض البيانات فقط؛ كل نموذج أدناه ينفذ تعديلًا حقيقيًا في النظام.</p>
          </div>
          <div style={{display:'flex',gap:10,alignItems:'center'}}>
            <Link className="card" href="/admin/dashboard">← لوحة التحكم</Link>
            <Link className="card" href="/">👁️ معاينة الموقع</Link>
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
            {(products??[] as Product[]).map((p:Product)=>(
              <div className="card" key={p.id}>
                <div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'center',flexWrap:'wrap',marginBottom:12}}>
                  <div><span className="kicker">PRODUCT #{p.id}</span><h3 style={{margin:'4px 0 0'}}>تعديل المنتج: {p.name}</h3></div>
                  <Link href={`/products/${p.slug}`} target="_blank" rel="noreferrer" className="card" style={{textDecoration:'none'}}>👁️ فتح صفحة المنتج</Link>
                </div>
                <ProductForm product={p} categories={(categories??[]) as Category[]} action={saveProduct}/>
                <div style={{marginTop:16,paddingTop:16,borderTop:'1px solid rgba(255,255,255,.08)'}}>
                  <strong>الصور والفيديوهات</strong>
                  <small className="muted" style={{display:'block',marginTop:8}}>تُضاف الوسائط الآن من نموذج المنتج نفسه عند الضغط على «حفظ المنتج». الملفات الموجودة هنا مرتبطة بهذا المنتج مباشرة.</small>
                  <div style={{display:'flex',gap:10,flexWrap:'wrap',marginTop:12}}>
                    {productMedia.filter((m:ProductMedia)=>m.product_id===p.id).map((m:ProductMedia)=><div className="card" key={m.id} style={{width:180}}>
                      {m.url && m.media_type==='image' ? <img src={m.url} alt="" style={{width:'100%',height:120,objectFit:'cover',borderRadius:8}} /> : m.url ? <video src={m.url} controls style={{width:'100%',height:120,objectFit:'cover',borderRadius:8}} /> : null}
                      <small className="muted">{m.media_type} · {Math.round(m.file_size/1024)} KB</small>
                      <form action={deleteProductMedia} style={{marginTop:6}}><input type="hidden" name="id" value={m.id}/><button type="submit">حذف الوسيط</button></form>
                    </div>)}
                  </div>
                </div>
                <form action={deleteProduct} style={{marginTop:8}}>
                  <input type="hidden" name="id" value={p.id}/>
                  <button type="submit">حذف المنتج</button>
                </form>
              </div>
            ))}
            {(categories??[] as Category[]).map((c:Category)=>(
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
            {(leads??[] as Lead[]).map((lead:Lead)=>(
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
              {(posts??[] as Post[]).map((post:Post)=>(
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
              {(contributions??[] as Contribution[]).map((item:Contribution)=>(
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
                {(roles??[] as Role[]).map((r:Role)=><form action={saveRole} key={r.id} style={formGrid}>
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
                {(permissions??[] as Permission[]).map((p:Permission)=><div key={p.id}><strong>{p.key}</strong><div className="muted">{p.name}</div></div>)}
              </div>
            </div>
            <div className="card">
              <h3>تعيين دور لمستخدم</h3>
              <form action={assignUserRole} style={formGrid}>
                <select name="user_id" required>{(profiles??[] as Profile[]).map((p:Profile)=><option key={p.id} value={p.id}>{p.full_name || p.username || p.id}</option>)}</select>
                <select name="role_id" required>{(roles??[] as Role[]).map((r:Role)=><option key={r.id} value={r.id}>{r.name} ({r.key})</option>)}</select>
                <button type="submit">تعيين الدور</button>
              </form>
              <div style={{display:'grid',gap:8,marginTop:14}}>
                {(userRoles??[] as UserRole[]).map((ur:UserRole)=>{
                  const profile=(profiles??[] as Profile[]).find((p:Profile)=>p.id===ur.user_id);
                  const role=(roles??[] as Role[]).find((r:Role)=>r.id===ur.role_id);
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
          <span className="kicker">USER ADMINISTRATION</span><h2>المستخدمون</h2>
          <div style={{display:'grid',gap:10,marginTop:18}}>
            {(profiles??[] as Profile[]).map((p:Profile)=>(
              <form action={updateAdminProfile} className="card" key={p.id} style={stackStyle}>
                <input type="hidden" name="id" value={p.id}/>
                <strong>{p.full_name || p.username || p.id}</strong>
                <input name="full_name" defaultValue={p.full_name ?? ''} placeholder="الاسم الكامل"/>
                <input name="username" defaultValue={p.username ?? ''} placeholder="اسم المستخدم"/>
                <select name="message_privacy" defaultValue="all_members">
                  <option value="all_members">كل الأعضاء</option><option value="members_only">الأعضاء فقط</option><option value="community">المجتمع</option><option value="friends">الأصدقاء</option>
                </select>
                <button type="submit">حفظ بيانات المستخدم</button>
              </form>
            ))}
          </div>
        </section>

        <section className="card" style={{marginTop:25}}>
          <span className="kicker">ROLE PERMISSIONS</span><h2>ربط الصلاحيات بالأدوار</h2>
          <div className="grid two" style={{marginTop:18}}>
            {(roles??[] as Role[]).map((role:Role)=>(
              <div className="card" key={role.id}>
                <h3>{role.name}</h3><div className="muted">{role.key}</div>
                <form action={assignRolePermission} style={formGrid}>
                  <input type="hidden" name="role_id" value={role.id}/>
                  <select name="permission_id" required>
                    {(permissions??[] as Permission[]).map((p:Permission)=><option key={p.id} value={p.id}>{p.key}</option>)}
                  </select>
                  <button type="submit">إضافة الصلاحية للدور</button>
                </form>
                <div style={{display:'grid',gap:6,marginTop:10}}>
                  {(rolePermissions??[] as RolePermission[]).filter((rp:RolePermission)=>rp.role_id===role.id).map((rp:RolePermission)=>{
                    const p=(permissions??[] as Permission[]).find((item:Permission)=>item.id===rp.permission_id);
                    return <form action={removeRolePermission} key={rp.permission_id} style={rowStyle}>
                      <input type="hidden" name="role_id" value={role.id}/><input type="hidden" name="permission_id" value={rp.permission_id}/>
                      <span>{p?.key || rp.permission_id}</span><button type="submit">إزالة</button>
                    </form>;
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="card" style={{marginTop:25}}>
          <span className="kicker">PAYMENTS / M15</span>
          <h2>بوابات الدفع وإعدادات التاجر</h2>
          <p className="muted">بيانات التاجر والمفاتيح ليست ثابتة في الكود. تُدار من هنا بواسطة Super Admin وتبقى خارج واجهة العميل. اترك حقول المفاتيح فارغة للحفاظ على القيمة الحالية.</p>
          <div style={{display:'grid',gap:14,marginTop:18}}>
            {(paymentProviders??[] as PaymentProvider[]).map((provider:PaymentProvider)=>
              <form action={savePaymentProviderConfig} className="card" key={provider.id} style={{display:'grid',gap:10}}>
                <input type="hidden" name="id" value={provider.id}/>
                <input type="hidden" name="provider_key" value={provider.provider_key}/>
                <input name="display_name" defaultValue={provider.display_name} required/>
                <select name="mode" defaultValue={provider.mode}><option value="sandbox">Sandbox / تجريبي</option><option value="live">Live / فعلي</option></select>
                <label><input type="checkbox" name="enabled" defaultChecked={provider.enabled}/> مفعّل</label>
                <input name="merchant_id" placeholder="Merchant ID / رقم التاجر (اختياري)" />
                <input name="public_key" placeholder="Public key (اختياري)" />
                <input name="api_key" type="password" placeholder="API key — اكتبها فقط عند التغيير" autoComplete="new-password" />
                <input name="secret_key" type="password" placeholder="Secret key — اكتبها فقط عند التغيير" autoComplete="new-password" />
                <button type="submit">حفظ إعدادات {provider.display_name}</button>
              </form>
            )}
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
            {(organizations??[] as Organization[]).map((o:Organization)=><form action={saveOrganization} className="card" key={o.id} style={rowStyle}>
              <input type="hidden" name="id" value={o.id}/>
              <input name="name" defaultValue={o.name} required/><input name="slug" defaultValue={o.slug} required/>
              <select name="type" defaultValue={o.type}><option value="company">شركة</option><option value="academy">أكاديمية</option><option value="partner">شريك</option><option value="internal">داخلية</option><option value="community">مجتمع</option></select>
              <select name="status" defaultValue={o.status}><option value="active">نشطة</option><option value="suspended">موقوفة</option><option value="archived">مؤرشفة</option></select>
              <button type="submit">حفظ</button>
            </form>)}
          </div>
        <section className="card" style={{marginTop:25}}>
          <span className="kicker">ORGANIZATION MEMBERSHIP</span><h2>أعضاء المؤسسات</h2>
          <div className="grid two" style={{marginTop:18}}>
            <div className="card">
              <h3>إضافة/تعديل عضوية</h3>
              <form action={saveOrganizationMember} style={formGrid}>
                <select name="organization_id" required>{(organizations??[] as Organization[]).map((o:Organization)=><option key={o.id} value={o.id}>{o.name}</option>)}</select>
                <select name="user_id" required>{(profiles??[] as Profile[]).map((p:Profile)=><option key={p.id} value={p.id}>{p.full_name || p.username || p.id}</option>)}</select>
                <select name="role_id" required>{(roles??[] as Role[]).map((r:Role)=><option key={r.id} value={r.id}>{r.name} ({r.key})</option>)}</select>
                <select name="status" defaultValue="active"><option value="active">نشط</option><option value="invited">مدعو</option><option value="suspended">موقوف</option><option value="removed">مزال</option></select>
                <button type="submit">حفظ العضوية</button>
              </form>
            </div>
            <div className="card">
              <h3>العضويات الحالية</h3>
              <div style={{display:'grid',gap:8}}>
                {(organizationMembers??[] as OrganizationMember[]).map((m:OrganizationMember)=>{
                  const org=(organizations??[] as Organization[]).find((o:Organization)=>o.id===m.organization_id);
                  const profile=(profiles??[] as Profile[]).find((p:Profile)=>p.id===m.user_id);
                  const role=(roles??[] as Role[]).find((r:Role)=>r.id===m.role_id);
                  return <form action={removeOrganizationMember} key={m.organization_id+'-'+m.user_id} className="card" style={rowStyle}>
                    <input type="hidden" name="organization_id" value={m.organization_id}/><input type="hidden" name="user_id" value={m.user_id}/>
                    <span>{org?.name || m.organization_id} → {profile?.full_name || profile?.username || m.user_id} → {role?.name || m.role_id} · {m.status}</span>
                    <button type="submit">إزالة</button>
                  </form>;
                })}
              </div>
            </div>
          </div>
        </section>
        </section>
      </div>
    </main>
  );
}

function ProductForm({product,categories,action}:{product?:Product;categories:Category[];action:(formData:FormData)=>Promise<void>}) {
  return <form action={action} method="post" encType="multipart/form-data" style={formGrid}>
    {product && <input type="hidden" name="id" value={product.id}/>}
    <input name="name" defaultValue={product?.name} placeholder="اسم المنتج" required/>
    <input name="slug" defaultValue={product?.slug} placeholder="slug (اختياري — يُنشأ تلقائيًا)" />
    <textarea name="description" defaultValue={product?.description} placeholder="الوصف"/>
    <input name="price_dzd" type="number" min="0" defaultValue={product?.price_dzd ?? ''} placeholder="السعر بالدينار"/>
    <input name="stock" type="number" min="0" defaultValue={product?.stock ?? 0} placeholder="المخزون"/>
    <select name="category_id" defaultValue={product?.category_id?.toString() ?? ''}><option value="">بدون فئة</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
    <label><input type="checkbox" name="active" defaultChecked={product?.active ?? true}/> نشط</label>
    <label><input type="checkbox" name="home_featured" defaultChecked={product?.home_featured ?? false}/> عرض قوي على الصفحة الرئيسية</label>
    <input name="ad_priority" type="number" min="0" max="100" defaultValue={product?.ad_priority ?? 0} placeholder="قوة الدعم الإعلاني 0–100" />
    <small className="muted">الأولوية الإعلانية تساعد المنتج على الظهور، بينما الطلب والأحدث يُحتسبان تلقائيًا.</small>
    <label>صور وفيديو المنتج
      <input name="media" type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime" multiple />
    </label>
    <small className="muted">يمكنك إضافة الصور والفيديو مباشرة مع حفظ المنتج. الحد الأقصى 50MB لكل ملف.</small>
    <button type="submit">{product ? 'حفظ المنتج' : 'إنشاء المنتج'}</button>
    {product && <Link href={`/products/${product.slug}`} target="_blank" rel="noreferrer" className="card" style={{textDecoration:'none',textAlign:'center'}}>👁️ معاينة المنتج في المتجر</Link>}
  </form>;
}

const formGrid: CSSProperties = {display:'grid',gap:10};
const rowStyle: CSSProperties = {display:'grid',gridTemplateColumns:'minmax(0,1fr) auto auto',gap:10,alignItems:'center'};
const stackStyle: CSSProperties = {display:'grid',gap:10,marginBottom:10};
