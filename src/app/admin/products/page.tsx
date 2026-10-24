import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { deleteProduct, deleteProductMedia, saveProduct } from '../actions';
import ProductMediaUploader from '@/components/admin/ProductMediaUploader';

export const dynamic = 'force-dynamic';

type Product = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  price_dzd: number | null;
  stock: number | null;
  active: boolean | null;
  category_id: number | null;
  ad_priority: number | null;
  home_featured: boolean | null;
};
type Category = { id: number; name: string; slug: string };
type Media = {
  id: string; product_id: number | null; media_type: string; mime_type: string;
  file_size: number; object_path: string; bucket_id: string; url: string | null;
};

export default async function AdminProducts({ searchParams }: {
  searchParams?: Promise<{ success?: string; error?: string; warning?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/admin/login');
  const { data: isSuperAdmin, error: authError } = await db.rpc('has_role', { role_key: 'super_admin' });
  if (authError || isSuperAdmin !== true) redirect('/');

  const [productResult, categoryResult, mediaResult] = await Promise.all([
    db.from('products').select('id,name,slug,description,price_dzd,stock,active,category_id,ad_priority,home_featured').order('id', { ascending: false }),
    db.from('categories').select('id,name,slug').order('name'),
    db.from('media_assets').select('id,product_id,media_type,mime_type,file_size,object_path,bucket_id').not('product_id', 'is', null).eq('upload_status', 'uploaded').order('created_at', { ascending: false }),
  ]);
  const products = (productResult.data ?? []) as Product[];
  const categories = (categoryResult.data ?? []) as Category[];
  // Batch signed URLs by bucket rather than issuing one request per media item.
  const mediaRows = mediaResult.data ?? [];
  const mediaByBucket = new Map<string, typeof mediaRows>();
  for (const row of mediaRows) {
    const bucket = row.bucket_id || 'aslan-media';
    mediaByBucket.set(bucket, [...(mediaByBucket.get(bucket) ?? []), row]);
  }
  const signedUrls = new Map<string, string>();
  await Promise.all(Array.from(mediaByBucket.entries()).map(async ([bucket, rows]) => {
    // Keep batches bounded so a large catalogue does not produce oversized requests.
    for (let start = 0; start < rows.length; start += 100) {
      const batch = rows.slice(start, start + 100);
      const { data, error } = await db.storage.from(bucket).createSignedUrls(batch.map(row => row.object_path), 3600);
      if (error) {
        console.error('[ASLAN product media] signed URL batch failed', { bucket, count: batch.length, message: error.message });
        continue;
      }
      for (const item of data ?? []) {
        if (item.signedUrl) signedUrls.set(bucket + ':' + item.path, item.signedUrl);
      }
    }
  }));
  const media: Media[] = mediaRows.map(row => {
    const bucket = row.bucket_id || 'aslan-media';
    return { ...row, bucket_id: bucket, url: signedUrls.get(bucket + ':' + row.object_path) ?? null } as Media;
  });

  const loadErrors = [
    productResult.error ? 'المنتجات: ' + productResult.error.message : null,
    categoryResult.error ? 'الفئات: ' + categoryResult.error.message : null,
    mediaResult.error ? 'الوسائط: ' + mediaResult.error.message : null,
  ].filter((message): message is string => Boolean(message));

  return (
    <main className="section">
      <div className="wrap">
        <div style={{display:'flex',justifyContent:'space-between',gap:16,alignItems:'center',flexWrap:'wrap'}}>
          <div><span className="kicker">ADMIN / MARKET / PRODUCTS</span><h1>إدارة المنتجات</h1><p className="muted">إنشاء وتعديل وحفظ ونشر المنتجات وإدارة الوسائط المرتبطة بها.</p></div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}><Link className="card" href="/admin/dashboard">مركز الإدارة</Link><Link className="card" href="/products" target="_blank">معاينة المتجر</Link><Link className="card" href="/admin/market">إدارة السوق</Link><Link className="card" href="/admin/categories">إدارة الفئات</Link></div>
        </div>
        {params.success && <div className="card" style={{marginTop:16,border:'1px solid #2f855a'}}><strong>✓ {params.success}</strong></div>}
        {params.error && <div className="card" role="alert" style={{marginTop:16,border:'1px solid #c53030'}}><strong>✕ {params.error}</strong></div>}
        {params.warning && <div className="card" role="status" style={{marginTop:16,border:'1px solid #b7791f'}}><strong>تنبيه: {params.warning}</strong></div>}
        {loadErrors.length > 0 && <div className="card" role="alert" style={{marginTop:16,border:'1px solid #c53030'}}>
          <strong>تعذر تحميل بعض بيانات إدارة المنتجات. لم يعتبر النظام البيانات غير المحمّلة فارغة.</strong>
          <ul>{loadErrors.map((message) => <li key={message}>{message}</li>)}</ul>
        </div>}

        <section className="card" style={{marginTop:24}}>
          <h2>إضافة منتج جديد</h2>
          <ProductForm categories={categories} />
        </section>

        <section style={{marginTop:28}}>
          <div className="head"><div><h2>المنتجات المسجلة ({products.length})</h2><p className="muted">كل نموذج يحفظ بيانات المنتج الفعلية في قاعدة البيانات.</p></div></div>
          <div style={{display:'grid',gap:18,marginTop:16}}>
            {products.map((product) => {
              const productMedia = media.filter((item) => item.product_id === product.id);
              return <article className="card" key={product.id}>
                <div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'center',flexWrap:'wrap'}}>
                  <div><span className="kicker">PRODUCT #{product.id}</span><h3 style={{margin:'5px 0'}}>{product.name}</h3><p className="muted">{product.price_dzd ?? 'حسب الطلب'} دج · المخزون {product.stock ?? 0} · {product.active ? 'منشور' : 'مسودة/غير نشط'}</p></div>
                  <Link className="card" href={`/products/${product.slug}`} target="_blank">معاينة المنتج</Link>
                </div>
                <ProductForm product={product} categories={categories} />
                <div style={{marginTop:18,paddingTop:14,borderTop:'1px solid rgba(255,255,255,.12)'}}>
                  <h4>الصور والفيديوهات ({productMedia.length})</h4>
                  <ProductMediaUploader productId={product.id} />
                  <div className="grid three" style={{marginTop:12}}>
                    {productMedia.map((item) => <div className="card" key={item.id}>
                      {item.url && item.media_type === 'image' ? <img loading="lazy" decoding="async" src={item.url} alt={product.name} style={{width:'100%',height:180,objectFit:'contain',borderRadius:8}} /> : null}
                      {item.url && item.media_type === 'video' ? <video preload="none" src={item.url} controls style={{width:'100%',maxHeight:220,borderRadius:8}} /> : null}
                      {!item.url && <p className="muted">تعذر إنشاء رابط معاينة للملف.</p>}
                      <small className="muted">{item.media_type} · {Math.ceil(item.file_size / 1024)} KB</small>
                      <form action={deleteProductMedia} style={{marginTop:8}}>
                        <input type="hidden" name="id" value={item.id}/><input type="hidden" name="return_to" value="/admin/products"/>
                        <button type="submit">حذف الملف</button>
                      </form>
                    </div>)}
                    {!productMedia.length && !mediaResult.error && <p className="muted">لا توجد وسائط مرتبطة بهذا المنتج حتى الآن.</p>}
                  </div>
                </div>
                <form action={deleteProduct} style={{marginTop:16}}>
                  <input type="hidden" name="id" value={product.id}/><input type="hidden" name="return_to" value="/admin/products"/>
                  <button type="submit">حذف المنتج</button>
                </form>
              </article>;
            })}
            {!products.length && !productResult.error && <article className="card"><p>لا توجد منتجات مسجلة. استخدم نموذج الإضافة أعلاه.</p></article>}
          </div>
        </section>
      </div>
    </main>
  );
}

function ProductForm({ product, categories }: { product?: Product; categories: Category[] }) {
  return <form action={saveProduct} style={{display:'grid',gap:10,marginTop:14}}>
    {product && <input type="hidden" name="id" value={product.id}/>}
    <input type="hidden" name="return_to" value="/admin/products"/>
    <label>اسم المنتج<input name="name" defaultValue={product?.name ?? ''} required /></label>
    <label>الرابط المختصر (يُنشأ تلقائيًا عند تركه فارغًا)<input name="slug" defaultValue={product?.slug ?? ''} /></label>
    <label>الوصف<textarea name="description" defaultValue={product?.description ?? ''} rows={4}/></label>
    <div className="grid three">
      <label>السعر بالدينار<input name="price_dzd" type="number" min="0" step="1" defaultValue={product?.price_dzd ?? ''}/></label>
      <label>المخزون<input name="stock" type="number" min="0" step="1" defaultValue={product?.stock ?? 0}/></label>
      <label>الفئة<select name="category_id" defaultValue={product?.category_id?.toString() ?? ''}><option value="">بدون فئة</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
    </div>
    <div className="grid three">
      <label><input type="checkbox" name="active" defaultChecked={product?.active ?? true}/> نشر المنتج/جعله نشطًا</label>
      <label><input type="checkbox" name="home_featured" defaultChecked={product?.home_featured ?? false}/> تمييزه في الرئيسية</label>
      <label>الأولوية الإعلانية 0–100<input name="ad_priority" type="number" min="0" max="100" defaultValue={product?.ad_priority ?? 0}/></label>
    </div>
    <p className="muted">أنشئ المنتج أولًا، ثم ارفع الصور والفيديوهات من بطاقة المنتج مباشرة إلى التخزين (حتى 50 MiB للملف). لا تُرسل الصور عبر نموذج إنشاء المنتج، لتجنّب فشل الحفظ بسبب حد طلبات الخادم.</p>
    <button type="submit">{product ? 'حفظ التعديلات' : 'إنشاء المنتج'}</button>
  </form>;
}
