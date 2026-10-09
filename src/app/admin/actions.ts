'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SupabaseAuditWriter } from '@/platform/audit';

async function requireSuperAdmin() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/admin/login');

  const { data, error } = await db.rpc('has_role', { role_key: 'super_admin' });
  if (error || data !== true) redirect('/');
  return { db, user };
}

function textValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim();
}

function nullableText(formData: FormData, key: string) {
  const value = textValue(formData, key);
  return value || null;
}

function algeriaDateTimeToIso(value: string): string | null {
  if (!value) return null;
  const normalized = value.length === 16 ? value + ':00' : value;
  const parsed = new Date(normalized + '+01:00');
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null;
}

function algeriaDateEndToIso(value: string): string | null {
  if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(value)) return null;
  const parsed = new Date(value + 'T23:59:59+01:00');
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null;
}

function slugify(value: string) {
  const transliteration: Record<string,string> = {
    'ا':'a','أ':'a','إ':'i','آ':'a','ب':'b','ت':'t','ث':'th','ج':'j','ح':'h','خ':'kh','د':'d','ذ':'dh',
    'ر':'r','ز':'z','س':'s','ش':'sh','ص':'s','ض':'d','ط':'t','ظ':'z','ع':'a','غ':'gh','ف':'f','ق':'q',
    'ك':'k','ل':'l','م':'m','ن':'n','ه':'h','و':'w','ي':'y','ى':'a','ة':'h','ء':'a','ئ':'y','ؤ':'w'
  };
  return Array.from(value.toLowerCase()).map(ch => transliteration[ch] ?? ch).join('')
    .normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80);
}

async function uniqueProductSlug(db: Awaited<ReturnType<typeof createClient>>, name: string, currentId?: number) {
  const base = slugify(name) || 'product';
  let candidate = base;
  let suffix = 2;
  while (true) {
    const { data, error } = await db.from('products').select('id').eq('slug', candidate).maybeSingle();
    if (error) dbError('تعذر التحقق من slug المنتج', error);
    if (!data || (currentId && data.id === currentId)) return candidate;
    candidate = `${base}-${suffix++}`;
  }
}

function dbError(action: string, error: { message?: string } | null | undefined, returnTo = '/admin/control'): never {
  const safeReturnTo = ['/admin/products', '/admin/categories', '/admin/content', '/admin/market', '/admin/company', '/admin/legacy', '/admin/services/catalog', '/admin/services', '/admin/access', '/admin/organizations', '/admin/payment-settings'].includes(returnTo) ? returnTo : '/admin/control';
  redirect(safeReturnTo + '?error=' + encodeURIComponent(error?.message ? action + ': ' + error.message : action));
}

async function audit(db: Awaited<ReturnType<typeof createClient>>, userId: string, action: 'CREATE'|'UPDATE'|'DELETE'|'AUTHORIZE'|'REVOKE'|'OTHER', resourceType: string, resourceId?: string, metadata?: Record<string, unknown>) {
  await new SupabaseAuditWriter().record({id: crypto.randomUUID() as never, occurredAt: new Date().toISOString() as never, actorId: userId as never, action, resourceType, resourceId: resourceId as never, success: true, metadata});
}

function finish(message: string, returnTo = '/admin/control'): never {
  const safeReturnTo = ['/admin/products', '/admin/categories', '/admin/content', '/admin/market', '/admin/company', '/admin/legacy', '/admin/services/catalog', '/admin/services', '/admin/access', '/admin/organizations', '/admin/payment-settings'].includes(returnTo) ? returnTo : '/admin/control';
  redirect(safeReturnTo + '?success=' + encodeURIComponent(message));
}

export async function saveProduct(formData: FormData) {
  const { db, user } = await requireSuperAdmin();
  const id = textValue(formData, 'id');
  const name = textValue(formData, 'name');
  const submittedSlug = textValue(formData, 'slug').toLowerCase();
  const returnTo = textValue(formData, 'return_to') === '/admin/products' ? '/admin/products' : '/admin/control';

  if (!name) {
    return redirect(returnTo + '?error=' + encodeURIComponent('اسم المنتج مطلوب.'));
  }

  const productIdInput = id ? Number(id) : null;
  if (id && (!Number.isInteger(productIdInput) || (productIdInput ?? 0) <= 0)) return redirect(returnTo + '?error=' + encodeURIComponent('معرّف المنتج غير صالح.'));
  const rawPrice = textValue(formData, 'price_dzd');
  const priceValue = rawPrice === '' ? null : Number(rawPrice);
  const rawStock = textValue(formData, 'stock');
  const stockValue = rawStock === '' ? 0 : Number(rawStock);
  const rawCategory = textValue(formData, 'category_id');
  const categoryValue = rawCategory === '' ? null : Number(rawCategory);
  if (priceValue !== null && (!Number.isFinite(priceValue) || priceValue < 0)) return redirect(returnTo + '?error=' + encodeURIComponent('السعر يجب أن يكون رقمًا غير سالب.'));
  if (!Number.isInteger(stockValue) || stockValue < 0) return redirect(returnTo + '?error=' + encodeURIComponent('المخزون يجب أن يكون عددًا صحيحًا غير سالب.'));
  if (categoryValue !== null && (!Number.isInteger(categoryValue) || categoryValue <= 0)) return redirect(returnTo + '?error=' + encodeURIComponent('الفئة المحددة غير صالحة.'));
  if (submittedSlug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(submittedSlug)) return redirect(returnTo + '?error=' + encodeURIComponent('الرابط المختصر يجب أن يحتوي على حروف لاتينية صغيرة وأرقام وشرطات فقط.'));
  const files = formData.getAll('media').filter(
    (item): item is File => item instanceof File && item.size > 0
  );
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

  // Validate the complete upload before any database write so invalid media
  // cannot leave a product created while the form reports failure.
  if (files.length > 1) {
    return redirect(returnTo + '?error=' + encodeURIComponent('أرفق صورة واحدة فقط عند إنشاء المنتج. يمكن إضافة صور أخرى بعد الحفظ.'));
  }
  for (const file of files) {
    if (!allowed.includes(file.type) || file.size > 1.5 * 1024 * 1024) {
      return redirect(returnTo + '?error=' + encodeURIComponent('الصورة غير صالحة أو تتجاوز 1.5MB: ' + file.name));
    }
  }

  const slug = submittedSlug || await uniqueProductSlug(db, name, productIdInput ?? undefined);

  const payload = {
    name,
    slug,
    description: textValue(formData, 'description'),
    price_dzd: priceValue,
    stock: stockValue,
    active: formData.get('active') === 'on',
    category_id: categoryValue,
    ad_priority: Math.min(100, Math.max(0, Number(formData.get('ad_priority') || 0) || 0)),
    home_featured: formData.get('home_featured') === 'on',
  };

  console.log('[M04 saveProduct] start', { id: productIdInput, userId: user.id, slug });

  let productId: number;

  if (productIdInput) {
    const { error } = await db.from('products').update(payload).eq('id', productIdInput);
    if (error) dbError('تعذر تعديل المنتج', error, returnTo);

    const { data: saved, error: verifyError } = await db
      .from('products')
      .select('id,name,slug,price_dzd,stock,active,category_id,ad_priority,home_featured')
      .eq('id', productIdInput)
      .maybeSingle();

    if (verifyError) dbError('تمت محاولة تعديل المنتج لكن تعذر التحقق من النتيجة', verifyError, returnTo);
    if (!saved) dbError('تمت محاولة تعديل المنتج لكن المنتج غير قابل للقراءة بعد الحفظ', null, returnTo);

    productId = saved.id;

    console.log('[M04 saveProduct] update verified', { productId, saved });
  } else {
    // Return the inserted row directly. A follow-up lookup by slug can be
    // blocked independently by RLS and can make a successful insert look failed.
    const { data: saved, error } = await db
      .from('products')
      .insert(payload)
      .select('id')
      .single();

    if (error) dbError('تعذر إنشاء المنتج', error, returnTo);
    if (!saved?.id) dbError('لم تُرجع قاعدة البيانات معرّف المنتج بعد الإنشاء', null, returnTo);

    productId = saved.id;

    console.log('[M04 saveProduct] insert verified', { productId });
  }

  for (const file of files) {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
    const objectPath = user.id + '/products/' + productId + '/' + crypto.randomUUID() + '.' + ext;
    const bytes = Buffer.from(await file.arrayBuffer());

    console.log('[M04 saveProduct] uploading media', {
      productId,
      name: file.name,
      type: file.type,
      size: file.size,
    });

    const { error: uploadError } = await db.storage.from('aslan-media').upload(objectPath, bytes, {
      contentType: file.type,
      upsert: false,
    });

    if (uploadError) dbError('تعذر رفع ' + file.name, uploadError, returnTo);

    const { error: mediaError } = await db.from('media_assets').insert({
      owner_id: user.id,
      product_id: productId,
      bucket_id: 'aslan-media',
      object_path: objectPath,
      media_type: file.type.startsWith('video/') ? 'video' : 'image',
      mime_type: file.type,
      file_size: file.size,
    });

    if (mediaError) {
      await db.storage.from('aslan-media').remove([objectPath]);
      dbError('تعذر ربط الوسيط بالمنتج', mediaError, returnTo);
    }
  }

  revalidatePath('/');
  revalidatePath('/products');
  revalidatePath('/products/' + slug);
  revalidatePath('/admin/dashboard');
  revalidatePath('/admin/control');

  await audit(db,user.id,id?'UPDATE':'CREATE','product',String(productId),{mediaCount:files.length});
  console.log('[M04 saveProduct] success', { productId, userId: user.id, mediaCount: files.length });

  finish(id ? 'تم حفظ المنتج وتحقق النظام من التعديل.' : 'تم إنشاء المنتج وتحقق النظام من الحفظ.', returnTo);
}
export async function uploadProductMedia(formData: FormData) {
  const {db,user}=await requireSuperAdmin(); const productId=Number(formData.get('product_id')); const file=formData.get('file');
  if(!productId||!(file instanceof File)||file.size===0)throw new Error('اختر ملف وسائط صالحًا.');
  const allowed=['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime']; if(!allowed.includes(file.type)||file.size>3*1024*1024)throw new Error('الملف غير صالح أو يتجاوز 3MB في نموذج الإدارة الحالي.');
  const ext=file.name.split('.').pop()?.toLowerCase()||'bin'; const objectPath=user.id+'/products/'+productId+'/'+crypto.randomUUID()+'.'+ext; const bytes=Buffer.from(await file.arrayBuffer());
  const {error:uploadError}=await db.storage.from('aslan-media').upload(objectPath,bytes,{contentType:file.type,upsert:false}); if(uploadError)dbError('تعذر رفع الوسيط',uploadError);
  const {error:mediaError}=await db.from('media_assets').insert({owner_id:user.id,product_id:productId,bucket_id:'aslan-media',object_path:objectPath,media_type:file.type.startsWith('video/')?'video':'image',mime_type:file.type,file_size:file.size});
  if(mediaError){await db.storage.from('aslan-media').remove([objectPath]);dbError('تعذر ربط الوسيط بالمنتج',mediaError);}
  revalidatePath('/');revalidatePath('/products');revalidatePath('/admin/control');finish('تم رفع الوسيط وربطه بالمنتج.');
}

export async function registerProductMedia(input: {
  productId: number;
  objectPath: string;
  mimeType: string;
  fileSize: number;
}): Promise<{ ok: boolean; error?: string }> {
  const { db, user } = await requireSuperAdmin();
  const allowed = new Set([
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'video/mp4', 'video/webm', 'video/quicktime',
  ]);
  if (!Number.isInteger(input.productId) || input.productId <= 0) {
    return { ok: false, error: 'معرّف المنتج غير صالح.' };
  }
  if (!allowed.has(input.mimeType)) {
    return { ok: false, error: 'نوع الملف غير مدعوم.' };
  }
  if (!Number.isFinite(input.fileSize) || input.fileSize <= 0 || input.fileSize > 50 * 1024 * 1024) {
    return { ok: false, error: 'يجب أن يكون حجم الملف بين 1 بايت و50 ميغابايت.' };
  }
  const expectedPrefix = user.id + '/products/' + input.productId + '/';
  if (!input.objectPath.startsWith(expectedPrefix) || input.objectPath.includes('..')) {
    return { ok: false, error: 'مسار الملف غير مطابق للمنتج أو المستخدم الحالي.' };
  }
  const { data: product, error: productError } = await db.from('products').select('id,slug').eq('id', input.productId).maybeSingle();
  if (productError || !product) {
    return { ok: false, error: productError?.message ?? 'المنتج غير موجود.' };
  }
  const { error } = await db.from('media_assets').insert({
    owner_id: user.id,
    product_id: input.productId,
    bucket_id: 'aslan-media',
    object_path: input.objectPath,
    media_type: input.mimeType.startsWith('video/') ? 'video' : 'image',
    mime_type: input.mimeType,
    file_size: input.fileSize,
  });
  if (error) return { ok: false, error: 'تم رفع الملف لكن تعذر ربطه بالمنتج: ' + error.message };
  await audit(db, user.id, 'CREATE', 'product_media', input.objectPath, { productId: input.productId, mimeType: input.mimeType, fileSize: input.fileSize });
  revalidatePath('/admin/products');
  revalidatePath('/products');
  revalidatePath('/products/' + product.slug);
  return { ok: true };
}

export async function deleteProductMedia(formData: FormData) {
  const {db}=await requireSuperAdmin(); const returnTo=textValue(formData,'return_to')==='/admin/products'?'/admin/products':'/admin/control'; const id=textValue(formData,'id'); if(!id)throw new Error('معرّف الوسيط غير صالح.');
  const {data:media,error:readError}=await db.from('media_assets').select('bucket_id,object_path').eq('id',id).maybeSingle(); if(readError)dbError('تعذر قراءة الوسيط',readError, returnTo); if(!media)throw new Error('الوسيط غير موجود.');
  const {error:storageError}=await db.storage.from(media.bucket_id).remove([media.object_path]); if(storageError)dbError('تعذر حذف ملف الوسيط',storageError, returnTo);
  const {error:deleteError}=await db.from('media_assets').delete().eq('id',id); if(deleteError)dbError('تعذر حذف سجل الوسيط',deleteError, returnTo);
  revalidatePath('/');revalidatePath('/products');revalidatePath('/admin/control'); revalidatePath('/admin/products');finish('تم حذف الوسيط.', returnTo);
}

export async function deleteProduct(formData: FormData) {
  const { db, user } = await requireSuperAdmin();
  const returnTo = textValue(formData, 'return_to') === '/admin/products' ? '/admin/products' : '/admin/control';
  const id = Number(formData.get('id'));
  if (!Number.isInteger(id) || id <= 0) return redirect(returnTo + '?error=' + encodeURIComponent('معرّف المنتج غير صالح.'));

  const { data: media, error: mediaReadError } = await db
    .from('media_assets')
    .select('id,bucket_id,object_path')
    .eq('product_id', id);
  if (mediaReadError) dbError('تعذر قراءة وسائط المنتج قبل الحذف', mediaReadError, returnTo);

  for (const item of media ?? []) {
    const { error: storageError } = await db.storage.from(item.bucket_id || 'aslan-media').remove([item.object_path]);
    if (storageError) dbError('تعذر حذف ملف الوسائط ' + item.object_path, storageError, returnTo);
  }

  if (media?.length) {
    const { error: mediaDeleteError } = await db.from('media_assets').delete().eq('product_id', id);
    if (mediaDeleteError) dbError('حُذفت الملفات من التخزين لكن تعذر حذف سجلات الوسائط', mediaDeleteError, returnTo);
  }

  const { error } = await db.from('products').delete().eq('id', id);
  if (error) dbError('تعذر حذف المنتج', error, returnTo);
  await audit(db, user.id, 'DELETE', 'product', String(id), { mediaCount: media?.length ?? 0 });
  revalidatePath('/');
  revalidatePath('/products');
  revalidatePath('/admin/dashboard');
  revalidatePath('/admin/control');
  revalidatePath('/admin/products');
  finish('تم حذف المنتج ووسائطه المرتبطة.', returnTo);
}

export async function saveCategory(formData: FormData) {
  const { db, user } = await requireSuperAdmin();
  const returnTo = textValue(formData, 'return_to') === '/admin/categories' ? '/admin/categories' : '/admin/control';
  const id = textValue(formData, 'id');
  const name = textValue(formData, 'name');
  const slug = textValue(formData, 'slug').toLowerCase();
  if (!name || !slug) return redirect(returnTo + '?error=' + encodeURIComponent('اسم الفئة والرابط المختصر مطلوبان.'));
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return redirect(returnTo + '?error=' + encodeURIComponent('الرابط المختصر يجب أن يحتوي على حروف لاتينية صغيرة وأرقام وشرطات فقط.'));
  const payload = { name, slug };
  const result = id
    ? await db.from('categories').update(payload).eq('id', Number(id))
    : await db.from('categories').insert(payload);
  if (result.error) dbError('تعذر حفظ الفئة', result.error, returnTo);
  await audit(db, user.id, id ? 'UPDATE' : 'CREATE', 'category', id || slug, { name, slug });
  revalidatePath('/products');
  revalidatePath('/admin/products');
  revalidatePath('/admin/market');
  revalidatePath('/admin/control');
  finish(id ? 'تم حفظ الفئة.' : 'تم إنشاء الفئة.', returnTo);
}

export async function deleteCategory(formData: FormData) {
  const { db, user } = await requireSuperAdmin();
  const returnTo = textValue(formData, 'return_to') === '/admin/categories' ? '/admin/categories' : '/admin/control';
  const id = Number(formData.get('id'));
  if (!Number.isInteger(id) || id <= 0) return redirect(returnTo + '?error=' + encodeURIComponent('معرّف الفئة غير صالح.'));
  const { error } = await db.from('categories').delete().eq('id', id);
  if (error) dbError('تعذر حذف الفئة؛ قد تكون مرتبطة بمنتجات', error, returnTo);
  await audit(db, user.id, 'DELETE', 'category', String(id));
  revalidatePath('/products');
  revalidatePath('/admin/products');
  revalidatePath('/admin/market');
  revalidatePath('/admin/control');
  finish('تم حذف الفئة.', returnTo);
}

export async function updateLeadStatus(formData: FormData) {
  const { db, user } = await requireSuperAdmin();
  const returnTo = '/admin/market';
  const id = Number(formData.get('id'));
  const status = textValue(formData, 'status');
  if (!Number.isInteger(id) || id <= 0 || !['new','contacted','qualified','closed'].includes(status)) {
    return redirect(returnTo + '?error=' + encodeURIComponent('بيانات العميل المحتمل غير صالحة.'));
  }
  const { error } = await db.from('leads').update({ status }).eq('id', id);
  if (error) dbError('تعذر تحديث حالة العميل المحتمل', error, returnTo);
  await audit(db, user.id, 'UPDATE', 'lead', String(id), { status });
  revalidatePath('/admin/dashboard');
  revalidatePath('/admin/market');
  revalidatePath('/admin/control');
  finish('تم تحديث حالة العميل المحتمل.', returnTo);
}

export async function updatePost(formData: FormData) {
  const { db, user } = await requireSuperAdmin();
  const returnTo = textValue(formData, 'return_to') === '/admin/content' ? '/admin/content' : '/admin/control';
  const id = textValue(formData, 'id');
  const status = textValue(formData, 'status');
  if (!id || !['draft','pending','needs_revision','accepted','published','rejected','archived'].includes(status)) return redirect(returnTo + '?error=' + encodeURIComponent('بيانات المنشور غير صالحة.'));
  const featured = formData.get('featured') === 'on';
  const { error } = await db.from('posts').update({ status, featured, featured_by: featured ? user.id : null, featured_at: featured ? new Date().toISOString() : null }).eq('id', id);
  if (error) dbError('تعذر تحديث المنشور', error, returnTo);
  await audit(db, user.id, 'UPDATE', 'post', id, { status, featured });
  revalidatePath('/');
  revalidatePath('/community');
  revalidatePath('/admin/dashboard');
  revalidatePath('/admin/control');
  revalidatePath('/admin/content');
  finish('تم تحديث المنشور.', returnTo);
}

export async function updateContribution(formData: FormData) {
  const { db, user } = await requireSuperAdmin();
  const returnTo = textValue(formData, 'return_to') === '/admin/content' ? '/admin/content' : '/admin/control';
  const id = textValue(formData, 'id');
  const status = textValue(formData, 'status');
  if (!id || !['pending','needs_revision','accepted','published','rejected'].includes(status)) return redirect(returnTo + '?error=' + encodeURIComponent('بيانات المساهمة غير صالحة.'));
  const featured = formData.get('featured') === 'on';
  const { error } = await db.from('contributions').update({
    status, featured, featured_by: featured ? user.id : null,
    featured_at: featured ? new Date().toISOString() : null,
    published_at: status === 'published' ? new Date().toISOString() : null,
  }).eq('id', id);
  if (error) dbError('تعذر تحديث المساهمة', error, returnTo);
  await audit(db, user.id, 'UPDATE', 'contribution', id, { status, featured });
  revalidatePath('/');
  revalidatePath('/community');
  revalidatePath('/admin/dashboard');
  revalidatePath('/admin/control');
  revalidatePath('/admin/content');
  finish('تم تحديث المساهمة.', returnTo);
}

export async function saveRole(formData: FormData) {
  const { db, user } = await requireSuperAdmin();
  const returnTo = '/admin/access';
  const id = textValue(formData, 'id');
  const key = textValue(formData, 'key');
  const name = textValue(formData, 'name');
  if (!/^[a-z][a-z0-9_]*$/.test(key) || !name) return redirect(returnTo + '?error=' + encodeURIComponent('مفتاح الدور واسمه مطلوبان وبصيغة صحيحة.'));
  const payload = { key, name, description: textValue(formData, 'description') };
  const result = id ? await db.from('roles').update(payload).eq('id', id) : await db.from('roles').insert(payload);
  if (result.error) dbError('تعذر حفظ الدور', result.error, returnTo);
  await audit(db, user.id, id ? 'UPDATE' : 'CREATE', 'role', id || key, { key, name });
  revalidatePath('/admin/access');
  revalidatePath('/admin/control');
  finish(id ? 'تم حفظ الدور.' : 'تم إنشاء الدور.', returnTo);
}

export async function savePermission(formData: FormData) {
  const { db, user } = await requireSuperAdmin();
  const returnTo = '/admin/access';
  const key = textValue(formData, 'key');
  const name = textValue(formData, 'name');
  if (!/^[a-z][a-z0-9_]*\\.[a-z][a-z0-9_]*$/.test(key) || !name) return redirect(returnTo + '?error=' + encodeURIComponent('مفتاح الصلاحية يجب أن يكون بصيغة module.action مع اسم واضح.'));
  const payload = { key, name, description: textValue(formData, 'description') };
  const { error } = await db.from('permissions').upsert(payload, { onConflict: 'key' });
  if (error) dbError('تعذر حفظ الصلاحية', error, returnTo);
  await audit(db, user.id, 'CREATE', 'permission', key, { name });
  revalidatePath('/admin/access');
  revalidatePath('/admin/control');
  finish('تم حفظ الصلاحية.', returnTo);
}

export async function assignUserRole(formData: FormData) {
  const { db, user } = await requireSuperAdmin();
  const returnTo = '/admin/access';
  const userId = textValue(formData, 'user_id');
  const roleId = textValue(formData, 'role_id');
  if (!userId || !roleId) return redirect(returnTo + '?error=' + encodeURIComponent('المستخدم والدور مطلوبان.'));
  const { error } = await db.from('user_roles').upsert({ user_id: userId, role_id: roleId }, { onConflict: 'user_id,role_id' });
  if (error) dbError('تعذر تعيين الدور للمستخدم', error, returnTo);
  await audit(db, user.id, 'AUTHORIZE', 'user_role', userId, { roleId });
  revalidatePath('/admin/access');
  revalidatePath('/admin/control');
  finish('تم تعيين الدور للمستخدم.', returnTo);
}

export async function removeUserRole(formData: FormData) {
  const { db, user } = await requireSuperAdmin();
  const returnTo = '/admin/access';
  const userId = textValue(formData, 'user_id');
  const roleId = textValue(formData, 'role_id');
  if (!userId || !roleId) return redirect(returnTo + '?error=' + encodeURIComponent('بيانات إزالة الدور غير صالحة.'));
  const { data: role, error: roleError } = await db.from('roles').select('key').eq('id', roleId).maybeSingle();
  if (roleError) dbError('تعذر التحقق من الدور', roleError, returnTo);
  if (role?.key === 'super_admin') {
    const { count, error: countError } = await db.from('user_roles').select('user_id', { count: 'exact', head: true }).eq('role_id', roleId);
    if (countError) dbError('تعذر التحقق من عدد مسؤولي النظام', countError, returnTo);
    if ((count ?? 0) <= 1) return redirect(returnTo + '?error=' + encodeURIComponent('لا يمكن إزالة آخر صلاحية Super Admin؛ أضف مسؤولًا آخر أولًا.'));
  }
  const { error } = await db.from('user_roles').delete().eq('user_id', userId).eq('role_id', roleId);
  if (error) dbError('تعذر إزالة الدور', error, returnTo);
  await audit(db, user.id, 'REVOKE', 'user_role', userId, { roleId });
  revalidatePath('/admin/access');
  revalidatePath('/admin/control');
  finish('تمت إزالة الدور.', returnTo);
}

export async function updateAdminProfile(formData: FormData) {
  const { db, user } = await requireSuperAdmin();
  const returnTo = '/admin/access';
  const id = textValue(formData, 'id');
  const fullName = nullableText(formData, 'full_name');
  const username = nullableText(formData, 'username');
  const messagePrivacy = textValue(formData, 'message_privacy');
  if (!id || !['members_only','all_members','community','friends'].includes(messagePrivacy)) return redirect(returnTo + '?error=' + encodeURIComponent('بيانات الملف الشخصي أو خصوصية الرسائل غير صالحة.'));
  const { error } = await db.from('profiles').update({ full_name: fullName, username, message_privacy: messagePrivacy }).eq('id', id);
  if (error) dbError('تعذر حفظ بيانات المستخدم', error, returnTo);
  await audit(db, user.id, 'UPDATE', 'profile', id, { username, messagePrivacy });
  revalidatePath('/admin/access');
  revalidatePath('/admin/control');
  finish('تم حفظ بيانات المستخدم.', returnTo);
}

export async function assignRolePermission(formData: FormData) {
  const { db, user } = await requireSuperAdmin();
  const returnTo = '/admin/access';
  const roleId = textValue(formData, 'role_id');
  const permissionId = textValue(formData, 'permission_id');
  if (!roleId || !permissionId) return redirect(returnTo + '?error=' + encodeURIComponent('الدور والصلاحية مطلوبان.'));
  const { error } = await db.from('role_permissions').upsert({ role_id: roleId, permission_id: permissionId }, { onConflict: 'role_id,permission_id' });
  if (error) dbError('تعذر ربط الصلاحية بالدور', error, returnTo);
  await audit(db, user.id, 'AUTHORIZE', 'role_permission', roleId, { permissionId });
  revalidatePath('/admin/access');
  finish('تم ربط الصلاحية بالدور.', returnTo);
}

export async function removeRolePermission(formData: FormData) {
  const { db, user } = await requireSuperAdmin();
  const returnTo = '/admin/access';
  const roleId = textValue(formData, 'role_id');
  const permissionId = textValue(formData, 'permission_id');
  if (!roleId || !permissionId) return redirect(returnTo + '?error=' + encodeURIComponent('بيانات إزالة الصلاحية غير صالحة.'));
  const { error } = await db.from('role_permissions').delete().eq('role_id', roleId).eq('permission_id', permissionId);
  if (error) dbError('تعذر إزالة الصلاحية من الدور', error, returnTo);
  await audit(db, user.id, 'REVOKE', 'role_permission', roleId, { permissionId });
  revalidatePath('/admin/access');
  finish('تمت إزالة الصلاحية من الدور.', returnTo);
}

export async function saveOrganization(formData: FormData) {
  const { db, user } = await requireSuperAdmin();
  const returnTo = '/admin/organizations';
  const id = textValue(formData, 'id');
  const name = textValue(formData, 'name');
  const slug = textValue(formData, 'slug').toLowerCase();
  const type = textValue(formData, 'type');
  const status = textValue(formData, 'status') || 'active';
  if (!name || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !['company','academy','partner','internal','community'].includes(type) || !['active','suspended','archived'].includes(status)) {
    return redirect(returnTo + '?error=' + encodeURIComponent('بيانات المؤسسة غير صالحة.'));
  }
  const payload = { name, slug, type, status };
  const result = id ? await db.from('organizations').update(payload).eq('id', id) : await db.from('organizations').insert(payload);
  if (result.error) dbError('تعذر حفظ المؤسسة', result.error, returnTo);
  await audit(db, user.id, id ? 'UPDATE' : 'CREATE', 'organization', id || slug, { type, status });
  revalidatePath('/admin/organizations');
  revalidatePath('/admin/control');
  finish(id ? 'تم حفظ المؤسسة.' : 'تم إنشاء المؤسسة.', returnTo);
}

export async function saveOrganizationMember(formData: FormData) {
  const { db, user } = await requireSuperAdmin();
  const returnTo = '/admin/organizations';
  const organizationId = textValue(formData, 'organization_id');
  const userId = textValue(formData, 'user_id');
  const roleId = textValue(formData, 'role_id');
  const status = textValue(formData, 'status') || 'active';
  if (!organizationId || !userId || !roleId || !['active','invited','suspended','removed'].includes(status)) return redirect(returnTo + '?error=' + encodeURIComponent('بيانات عضوية المؤسسة غير صالحة.'));
  const { error } = await db.from('organization_members').upsert({ organization_id: organizationId, user_id: userId, role_id: roleId, status }, { onConflict: 'organization_id,user_id' });
  if (error) dbError('تعذر حفظ عضوية المؤسسة', error, returnTo);
  await audit(db, user.id, 'UPDATE', 'organization_member', organizationId, { userId, roleId, status });
  revalidatePath('/admin/organizations');
  finish('تم حفظ عضوية المؤسسة.', returnTo);
}

export async function removeOrganizationMember(formData: FormData) {
  const { db, user } = await requireSuperAdmin();
  const returnTo = '/admin/organizations';
  const organizationId = textValue(formData, 'organization_id');
  const userId = textValue(formData, 'user_id');
  if (!organizationId || !userId) return redirect(returnTo + '?error=' + encodeURIComponent('بيانات إزالة العضوية غير صالحة.'));
  const { error } = await db.from('organization_members').delete().eq('organization_id', organizationId).eq('user_id', userId);
  if (error) dbError('تعذر إزالة عضوية المؤسسة', error, returnTo);
  await audit(db, user.id, 'DELETE', 'organization_member', organizationId, { userId });
  revalidatePath('/admin/organizations');
  finish('تمت إزالة عضوية المؤسسة.', returnTo);
}


export async function saveCompanyContent(formData: FormData) {
  const { db, user } = await requireSuperAdmin();
  const returnTo = '/admin/company';
  const id = textValue(formData,'id');
  const contentType = textValue(formData,'content_type');
  const slug = textValue(formData,'slug');
  const title = textValue(formData,'title');
  if (!['about','vision','mission','activity','project','portfolio','news','faq'].includes(contentType) || !slug || !title) {
    return redirect(returnTo + '?error=' + encodeURIComponent('بيانات محتوى الشركة غير صالحة.'));
  }
  const rawSortOrder = textValue(formData, 'sort_order');
  const sortOrder = rawSortOrder === '' ? 0 : Number(rawSortOrder);
  if (!Number.isInteger(sortOrder) || sortOrder < 0) return redirect(returnTo + '?error=' + encodeURIComponent('ترتيب المحتوى يجب أن يكون عددًا صحيحًا غير سالب.'));
  const payload = {
    content_type: contentType,
    slug,
    title,
    excerpt: textValue(formData,'excerpt'),
    body: textValue(formData,'body'),
    sort_order: sortOrder,
    published: formData.get('published') === 'on',
    published_at: formData.get('published') === 'on' ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  };
  const result = id ? await db.from('company_content').update(payload).eq('id',id) : await db.from('company_content').insert(payload);
  if (result.error) dbError('تعذر حفظ محتوى الشركة', result.error, returnTo);
  await audit(db,user.id,id?'UPDATE':'CREATE','company_content',id || slug,{contentType,slug});
  revalidatePath('/company');
  revalidatePath('/company/'+contentType);
  revalidatePath('/admin/company');
  revalidatePath('/admin/control');
  finish(id ? 'تم تحديث محتوى الشركة.' : 'تم إنشاء محتوى الشركة.', returnTo);
}

export async function deleteCompanyContent(formData: FormData) {
  const { db, user } = await requireSuperAdmin();
  const returnTo = '/admin/company';
  const id = textValue(formData,'id');
  if (!id) return redirect(returnTo + '?error=' + encodeURIComponent('معرّف المحتوى غير صالح.'));
  const { error } = await db.from('company_content').delete().eq('id',id);
  if (error) dbError('تعذر حذف محتوى الشركة', error, returnTo);
  await audit(db,user.id,'DELETE','company_content',id);
  revalidatePath('/company');
  revalidatePath('/admin/company');
  revalidatePath('/admin/control');
  finish('تم حذف محتوى الشركة.', returnTo);
}

export async function savePaymentProviderConfig(formData: FormData) {
  const { db, user } = await requireSuperAdmin();
  const returnTo = '/admin/payment-settings';
  const id = textValue(formData,'id');
  const providerKey = textValue(formData,'provider_key');
  const displayName = textValue(formData,'display_name');
  const mode = textValue(formData,'mode') || 'sandbox';
  const enabled = formData.get('enabled') === 'on';
  const merchantId = nullableText(formData,'merchant_id');
  const publicKey = nullableText(formData,'public_key');
  const apiKey = nullableText(formData,'api_key');
  const secretKey = nullableText(formData,'secret_key');
  const instructions = nullableText(formData,'instructions');
  if (!id || !providerKey || !displayName || !['sandbox','live'].includes(mode)) return redirect(returnTo + '?error=' + encodeURIComponent('بيانات بوابة الدفع غير صالحة.'));

  const { data: current, error: readError } = await db.from('payment_provider_configs').select('config_data').eq('id',id).single();
  if (readError) dbError('تعذر قراءة إعدادات بوابة الدفع', readError, returnTo);
  const previous = (current?.config_data && typeof current.config_data === 'object' && !Array.isArray(current.config_data)) ? current.config_data as Record<string,unknown> : {};
  const config_data = {
    ...previous,
    ...(merchantId ? { merchant_id: merchantId } : {}),
    ...(publicKey ? { public_key: publicKey } : {}),
    ...(apiKey ? { api_key: apiKey } : {}),
    ...(secretKey ? { secret_key: secretKey } : {}),
    ...(instructions ? { instructions } : {}),
  };
  const { error } = await db.from('payment_provider_configs').update({display_name:displayName,enabled,mode,config_data,updated_at:new Date().toISOString()}).eq('id',id);
  if (error) dbError('تعذر حفظ إعدادات بوابة الدفع', error, returnTo);
  await audit(db,user.id,'UPDATE','payment_provider_configs',id,{providerKey,enabled,mode});
  revalidatePath('/admin/payment-settings');
  revalidatePath('/admin/control');
  finish('تم حفظ إعدادات بوابة الدفع.', returnTo);
}

export async function saveService(formData: FormData) {
  const { db, user } = await requireSuperAdmin();
  const returnTo = '/admin/services/catalog';
  const id = textValue(formData, 'id');
  const name = textValue(formData, 'name');
  const slug = textValue(formData, 'slug').toLowerCase();
  const description = textValue(formData, 'description');
  if (!name || !slug) return redirect(returnTo + '?error=' + encodeURIComponent('اسم الخدمة والرابط المختصر مطلوبان.'));
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return redirect(returnTo + '?error=' + encodeURIComponent('الرابط المختصر غير صالح.'));
  const payload = { name, slug, description, active: formData.get('active') === 'on', updated_at: new Date().toISOString() };
  const result = id
    ? await db.from('services').update(payload).eq('id', id)
    : await db.from('services').insert(payload);
  if (result.error) dbError('تعذر حفظ الخدمة', result.error, returnTo);
  await audit(db, user.id, id ? 'UPDATE' : 'CREATE', 'service', id || slug, { name, slug, active: payload.active });
  revalidatePath('/services');
  revalidatePath('/admin/services');
  revalidatePath('/admin/services/catalog');
  revalidatePath('/admin/control');
  finish(id ? 'تم حفظ تعديلات الخدمة.' : 'تم إنشاء الخدمة.', returnTo);
}

export async function deleteService(formData: FormData) {
  const { db, user } = await requireSuperAdmin();
  const returnTo = '/admin/services/catalog';
  const id = textValue(formData, 'id');
  if (!id) return redirect(returnTo + '?error=' + encodeURIComponent('معرّف الخدمة غير صالح.'));
  const { error } = await db.from('services').delete().eq('id', id);
  if (error) dbError('تعذر حذف الخدمة؛ قد تكون مرتبطة بطلبات خدمة موجودة', error, returnTo);
  await audit(db, user.id, 'DELETE', 'service', id);
  revalidatePath('/services');
  revalidatePath('/admin/services');
  revalidatePath('/admin/services/catalog');
  finish('تم حذف الخدمة.', returnTo);
}

export async function issueServiceQuote(formData: FormData) {
  const { db, user } = await requireSuperAdmin();
  const requestId = textValue(formData, 'request_id');
  const amount = Number(textValue(formData, 'amount'));
  const validUntilText = textValue(formData, 'valid_until');
  const validUntil = validUntilText ? algeriaDateEndToIso(validUntilText) : null;
  const notes = textValue(formData, 'notes');
  if (!requestId || !Number.isFinite(amount) || amount < 0) return redirect('/admin/services?error=' + encodeURIComponent('حدد طلب خدمة ومبلغ عرض صحيح.'));
  if (validUntilText && !validUntil) return redirect('/admin/services?error=' + encodeURIComponent('تاريخ صلاحية العرض غير صالح.'));
  const quoteNumber = 'ASQ-' + new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14) + '-' + crypto.randomUUID().slice(0, 6).toUpperCase();
  const { data: quoteId, error } = await db.rpc('create_service_quote', {
    p_request_id: requestId,
    p_quote_number: quoteNumber,
    p_amount: amount,
    p_currency: 'DZD',
    p_valid_until: validUntil,
    p_notes: notes,
  });
  if (error) dbError('تعذر إصدار عرض السعر', error, '/admin/services');
  await audit(db, user.id, 'CREATE', 'service_quote', String(quoteId), { requestId, quoteNumber, amount });
  revalidatePath('/admin/services');
  revalidatePath('/service-requests');
  finish('تم إصدار عرض السعر ' + quoteNumber + ' وتحديث الطلب إلى quoted.', '/admin/services');
}

export async function scheduleServiceAppointment(formData: FormData) {
  const { db, user } = await requireSuperAdmin();
  const requestId = textValue(formData, 'request_id');
  const startsAtText = textValue(formData, 'starts_at');
  const endsAtText = textValue(formData, 'ends_at');
  const assignedTo = textValue(formData, 'assigned_to') || null;
  const location = textValue(formData, 'location') || null;
  const notes = textValue(formData, 'notes');
  const startsAt = algeriaDateTimeToIso(startsAtText);
  const endsAt = algeriaDateTimeToIso(endsAtText);
  if (!requestId || !startsAt || !endsAt || new Date(endsAt) <= new Date(startsAt)) {
    return redirect('/admin/services?error=' + encodeURIComponent('حدد الطلب ووقت بداية ونهاية صحيحين للموعد.'));
  }
  const { data: appointmentId, error } = await db.rpc('create_service_appointment', {
    p_request_id: requestId,
    p_starts_at: startsAt,
    p_ends_at: endsAt,
    p_assigned_to: assignedTo,
    p_location: location,
    p_notes: notes,
  });
  if (error) dbError('تعذر جدولة الموعد', error, '/admin/services');
  await audit(db, user.id, 'CREATE', 'service_appointment', String(appointmentId), { requestId, startsAt: startsAtText, endsAt: endsAtText, assignedTo });
  revalidatePath('/admin/services');
  revalidatePath('/service-requests');
  finish('تم إنشاء الموعد وربطه بطلب الخدمة.', '/admin/services');
}

export async function transitionServiceRequest(formData: FormData) {
  const { db, user } = await requireSuperAdmin();
  const returnTo = textValue(formData, 'return_to') === '/admin/services' ? '/admin/services' : '/admin/control';
  const requestId = textValue(formData, 'request_id');
  const toStatus = textValue(formData, 'to_status');
  const note = textValue(formData, 'note');
  if (!requestId || !toStatus) throw new Error('بيانات انتقال طلب الخدمة غير صالحة.');
  const { error } = await db.rpc('transition_service_request', { p_request_id: requestId, p_to_status: toStatus, p_note: note });
  if (error) dbError('تعذر تغيير حالة طلب الخدمة', error, returnTo);
  await audit(db, user.id, 'UPDATE', 'service_requests', requestId, { toStatus, note });
  revalidatePath('/admin/services');
  revalidatePath('/service-requests');
  finish('تم تحديث حالة طلب الخدمة.', returnTo);
}

export async function markPaymentPaid(formData: FormData) {
  const { db, user } = await requireSuperAdmin();
  const paymentId = textValue(formData, 'payment_id');
  if (!paymentId) throw new Error('معرّف الدفع غير صالح.');
  const { data: payment, error: paymentError } = await db.from('payments').select('id,invoice_id').eq('id',paymentId).single();
  if (paymentError || !payment) dbError('تعذر قراءة الدفع', paymentError || new Error('NOT_FOUND'));
  const now = new Date().toISOString();
  const { error } = await db.from('payments').update({status:'paid',paid_at:now}).eq('id',paymentId);
  if (error) dbError('تعذر تأكيد الدفع', error);
  const { error: invoiceError } = await db.from('invoices').update({status:'paid',paid_at:now}).eq('id',payment.invoice_id);
  if (invoiceError) dbError('تعذر تحديث الفاتورة', invoiceError);
  await audit(db,user.id,'UPDATE','payments',paymentId,{status:'paid',invoiceId:payment.invoice_id});
  revalidatePath('/admin/payments');
  revalidatePath('/invoices');
  finish('تم تأكيد الدفع وتحديث الفاتورة.');
}
