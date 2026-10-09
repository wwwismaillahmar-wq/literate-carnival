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
  const safeReturnTo = returnTo === '/admin/products' ? returnTo : '/admin/control';
  redirect(safeReturnTo + '?error=' + encodeURIComponent(error?.message ? action + ': ' + error.message : action));
}

async function audit(db: Awaited<ReturnType<typeof createClient>>, userId: string, action: 'CREATE'|'UPDATE'|'DELETE'|'AUTHORIZE'|'REVOKE'|'OTHER', resourceType: string, resourceId?: string, metadata?: Record<string, unknown>) {
  await new SupabaseAuditWriter().record({id: crypto.randomUUID() as never, occurredAt: new Date().toISOString() as never, actorId: userId as never, action, resourceType, resourceId: resourceId as never, success: true, metadata});
}

function finish(message: string, returnTo = '/admin/control'): never {
  const safeReturnTo = returnTo === '/admin/products' ? returnTo : '/admin/control';
  redirect(safeReturnTo + '?success=' + encodeURIComponent(message));
}

export async function saveProduct(formData: FormData) {
  const { db, user } = await requireSuperAdmin();
  const id = textValue(formData, 'id');
  const name = textValue(formData, 'name');
  const submittedSlug = textValue(formData, 'slug');
  const returnTo = textValue(formData, 'return_to') === '/admin/products' ? '/admin/products' : '/admin/control';

  if (!name) {
    return redirect(returnTo + '?error=' + encodeURIComponent('اسم المنتج مطلوب.'));
  }

  const productIdInput = id ? Number(id) : null;
  const slug = submittedSlug || await uniqueProductSlug(db, name, productIdInput ?? undefined);

  const payload = {
    name,
    slug,
    description: textValue(formData, 'description'),
    price_dzd: Number(formData.get('price_dzd') || 0) || null,
    stock: Math.max(0, Number(formData.get('stock') || 0)),
    active: formData.get('active') === 'on',
    category_id: nullableText(formData, 'category_id') ? Number(formData.get('category_id')) : null,
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
    const { error } = await db.from('products').insert(payload);
    if (error) dbError('تعذر إنشاء المنتج', error, returnTo);

    const { data: saved, error: verifyError } = await db
      .from('products')
      .select('id')
      .eq('slug', slug)
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (verifyError) dbError('تم إنشاء المنتج لكن تعذر التحقق من النتيجة', verifyError, returnTo);
    if (!saved) dbError('تم إنشاء المنتج لكن لم يظهر بعد في قاعدة البيانات', null, returnTo);

    productId = saved.id;

    console.log('[M04 saveProduct] insert verified', { productId });
  }

  const files = formData.getAll('media').filter(
    (item): item is File => item instanceof File && item.size > 0
  );

  const allowed = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/webm',
    'video/quicktime',
  ];

  for (const file of files) {
    if (!allowed.includes(file.type) || file.size > 1.5 * 1024 * 1024) {
      return redirect(returnTo + '?error=' + encodeURIComponent('الملف غير صالح أو يتجاوز 1.5MB في نموذج الإدارة الحالي: ' + file.name));
    }

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
}) {
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
  const { data: product, error: productError } = await db.from('products').select('id').eq('id', input.productId).maybeSingle();
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
  revalidatePath('/products/' + (await db.from('products').select('slug').eq('id', input.productId).single()).data?.slug);
  return { ok: true as const };
}

export async function deleteProductMedia(formData: FormData) {
  const {db}=await requireSuperAdmin(); const returnTo=textValue(formData,'return_to')==='/admin/products'?'/admin/products':'/admin/control'; const id=textValue(formData,'id'); if(!id)throw new Error('معرّف الوسيط غير صالح.');
  const {data:media,error:readError}=await db.from('media_assets').select('bucket_id,object_path').eq('id',id).maybeSingle(); if(readError)dbError('تعذر قراءة الوسيط',readError, returnTo); if(!media)throw new Error('الوسيط غير موجود.');
  const {error:storageError}=await db.storage.from(media.bucket_id).remove([media.object_path]); if(storageError)dbError('تعذر حذف ملف الوسيط',storageError, returnTo);
  const {error:deleteError}=await db.from('media_assets').delete().eq('id',id); if(deleteError)dbError('تعذر حذف سجل الوسيط',deleteError, returnTo);
  revalidatePath('/');revalidatePath('/products');revalidatePath('/admin/control'); revalidatePath('/admin/products');finish('تم حذف الوسيط.', returnTo);
}

export async function deleteProduct(formData: FormData) {
  const {db}=await requireSuperAdmin(); const returnTo=textValue(formData,'return_to')==='/admin/products'?'/admin/products':'/admin/control'; const id=Number(formData.get('id')); if(!id)throw new Error('معرّف المنتج غير صالح.');
  const {error}=await db.from('products').delete().eq('id',id); if(error)dbError('تعذر حذف المنتج',error, returnTo); await audit(db,(await db.auth.getUser()).data.user!.id,'DELETE','product',String(id));
  revalidatePath('/');revalidatePath('/products');revalidatePath('/admin/dashboard');revalidatePath('/admin/control'); revalidatePath('/admin/products');finish('تم حذف المنتج.', returnTo);
}

export async function saveCategory(formData: FormData) {
  const {db}=await requireSuperAdmin(); const id=textValue(formData,'id'),name=textValue(formData,'name'),slug=textValue(formData,'slug'); if(!name||!slug)throw new Error('اسم الفئة وslug مطلوبان.');
  const payload={name,slug}; const result=id?await db.from('categories').update(payload).eq('id',Number(id)):await db.from('categories').insert(payload); if(result.error)dbError('تعذر حفظ الفئة',result.error);
  revalidatePath('/admin/dashboard');revalidatePath('/admin/control');finish(id?'تم حفظ الفئة.':'تم إنشاء الفئة.');
}

export async function deleteCategory(formData: FormData) {
  const {db}=await requireSuperAdmin(); const id=Number(formData.get('id')); if(!id)throw new Error('معرّف الفئة غير صالح.'); const {error}=await db.from('categories').delete().eq('id',id); if(error)dbError('تعذر حذف الفئة',error);
  revalidatePath('/admin/dashboard');revalidatePath('/admin/control');finish('تم حذف الفئة.');
}

export async function updateLeadStatus(formData: FormData) {
  const {db}=await requireSuperAdmin(); const id=Number(formData.get('id')),status=textValue(formData,'status'); if(!id||!['new','contacted','qualified','closed'].includes(status))throw new Error('بيانات العميل المحتمل غير صالحة.');
  const {error}=await db.from('leads').update({status}).eq('id',id); if(error)dbError('تعذر تحديث حالة العميل المحتمل',error); revalidatePath('/admin/dashboard');revalidatePath('/admin/control');finish('تم تحديث حالة العميل المحتمل.');
}

export async function updatePost(formData: FormData) {
  const {db,user}=await requireSuperAdmin(); const id=textValue(formData,'id'),status=textValue(formData,'status'); if(!id||!['draft','pending','needs_revision','accepted','published','rejected','archived'].includes(status))throw new Error('بيانات المنشور غير صالحة.');
  const featured=formData.get('featured')==='on'; const {error}=await db.from('posts').update({status,featured,featured_by:featured?user.id:null,featured_at:featured?new Date().toISOString():null}).eq('id',id); if(error)dbError('تعذر تحديث المنشور',error); await audit(db,user.id,'UPDATE','post',id,{status,featured});
  revalidatePath('/');revalidatePath('/admin/dashboard');revalidatePath('/admin/control');finish('تم تحديث المنشور.');
}

export async function updateContribution(formData: FormData) {
  const {db,user}=await requireSuperAdmin(); const id=textValue(formData,'id'),status=textValue(formData,'status'); if(!id||!['pending','needs_revision','accepted','published','rejected'].includes(status))throw new Error('بيانات المساهمة غير صالحة.');
  const featured=formData.get('featured')==='on'; const {error}=await db.from('contributions').update({status,featured,featured_by:featured?user.id:null,featured_at:featured?new Date().toISOString():null,published_at:status==='published'?new Date().toISOString():null}).eq('id',id); if(error)dbError('تعذر تحديث المساهمة',error); await audit(db,user.id,'UPDATE','contribution',id,{status,featured});
  revalidatePath('/');revalidatePath('/admin/dashboard');revalidatePath('/admin/control');finish('تم تحديث المساهمة.');
}

export async function saveRole(formData: FormData) {
  const {db}=await requireSuperAdmin(); const id=textValue(formData,'id'),key=textValue(formData,'key'),name=textValue(formData,'name'); if(!key||!name)throw new Error('مفتاح الدور واسمه مطلوبان.');
  const payload={key,name,description:textValue(formData,'description')}; const result=id?await db.from('roles').update(payload).eq('id',id):await db.from('roles').insert(payload); if(result.error)dbError('تعذر حفظ الدور',result.error);
  revalidatePath('/admin/dashboard');revalidatePath('/admin/control');finish(id?'تم حفظ الدور.':'تم إنشاء الدور.');
}

export async function savePermission(formData: FormData) {
  const {db}=await requireSuperAdmin(); const key=textValue(formData,'key'),name=textValue(formData,'name'); if(!key||!name)throw new Error('مفتاح الصلاحية واسمها مطلوبان.');
  const {error}=await db.from('permissions').upsert({key,name,description:textValue(formData,'description')},{onConflict:'key'}); if(error)dbError('تعذر حفظ الصلاحية',error);
  revalidatePath('/admin/dashboard');revalidatePath('/admin/control');finish('تم حفظ الصلاحية.');
}

export async function assignUserRole(formData: FormData) {
  const {db}=await requireSuperAdmin(); const userId=textValue(formData,'user_id'),roleId=textValue(formData,'role_id'); if(!userId||!roleId)throw new Error('المستخدم والدور مطلوبان.');
  const {error}=await db.from('user_roles').upsert({user_id:userId,role_id:roleId},{onConflict:'user_id,role_id'}); if(error)dbError('تعذر تعيين الدور للمستخدم',error); await audit(db,(await db.auth.getUser()).data.user!.id,'AUTHORIZE','user_role',userId,{roleId});
  revalidatePath('/admin/dashboard');revalidatePath('/admin/control');finish('تم تعيين الدور للمستخدم.');
}

export async function removeUserRole(formData: FormData) {
  const {db}=await requireSuperAdmin(); const userId=textValue(formData,'user_id'),roleId=textValue(formData,'role_id'); if(!userId||!roleId)throw new Error('بيانات إزالة الدور غير صالحة.');
  const {error}=await db.from('user_roles').delete().eq('user_id',userId).eq('role_id',roleId); if(error)dbError('تعذر إزالة الدور',error); revalidatePath('/admin/dashboard');revalidatePath('/admin/control');finish('تمت إزالة الدور.');
}

export async function saveOrganization(formData: FormData) {
  const {db}=await requireSuperAdmin(); const id=textValue(formData,'id'),name=textValue(formData,'name'),slug=textValue(formData,'slug'),type=textValue(formData,'type'),status=textValue(formData,'status')||'active'; if(!name||!slug||!['company','academy','partner','internal','community'].includes(type))throw new Error('بيانات المؤسسة غير صالحة.');
  const payload={name,slug,type,status}; const result=id?await db.from('organizations').update(payload).eq('id',id):await db.from('organizations').insert(payload); if(result.error)dbError('تعذر حفظ المؤسسة',result.error);
  revalidatePath('/admin/dashboard');revalidatePath('/admin/control');finish(id?'تم حفظ المؤسسة.':'تم إنشاء المؤسسة.');
}

export async function updateAdminProfile(formData: FormData) {
  const {db}=await requireSuperAdmin(); const id=textValue(formData,'id'); if(!id)throw new Error('معرّف المستخدم غير صالح.');
  const {error}=await db.from('profiles').update({full_name:nullableText(formData,'full_name'),username:nullableText(formData,'username'),message_privacy:textValue(formData,'message_privacy')||'all_members'}).eq('id',id); if(error)dbError('تعذر حفظ بيانات المستخدم',error);
  revalidatePath('/admin/dashboard');revalidatePath('/admin/control');finish('تم حفظ بيانات المستخدم.');
}

export async function assignRolePermission(formData: FormData) {
  const {db}=await requireSuperAdmin(); const roleId=textValue(formData,'role_id'),permissionId=textValue(formData,'permission_id'); if(!roleId||!permissionId)throw new Error('الدور والصلاحية مطلوبان.');
  const {error}=await db.from('role_permissions').upsert({role_id:roleId,permission_id:permissionId},{onConflict:'role_id,permission_id'}); if(error)dbError('تعذر ربط الصلاحية بالدور',error);
  revalidatePath('/admin/control');finish('تم ربط الصلاحية بالدور.');
}

export async function removeRolePermission(formData: FormData) {
  const {db}=await requireSuperAdmin(); const roleId=textValue(formData,'role_id'),permissionId=textValue(formData,'permission_id'); if(!roleId||!permissionId)throw new Error('بيانات إزالة الصلاحية غير صالحة.');
  const {error}=await db.from('role_permissions').delete().eq('role_id',roleId).eq('permission_id',permissionId); if(error)dbError('تعذر إزالة الصلاحية من الدور',error); revalidatePath('/admin/control');finish('تمت إزالة الصلاحية من الدور.');
}

export async function saveOrganizationMember(formData: FormData) {
  const {db}=await requireSuperAdmin(); const organizationId=textValue(formData,'organization_id'),userId=textValue(formData,'user_id'),roleId=textValue(formData,'role_id'),status=textValue(formData,'status')||'active'; if(!organizationId||!userId||!roleId||!['active','invited','suspended','removed'].includes(status))throw new Error('بيانات عضوية المؤسسة غير صالحة.');
  const {error}=await db.from('organization_members').upsert({organization_id:organizationId,user_id:userId,role_id:roleId,status},{onConflict:'organization_id,user_id'}); if(error)dbError('تعذر حفظ عضوية المؤسسة',error);
  revalidatePath('/admin/control');finish('تم حفظ عضوية المؤسسة.');
}

export async function removeOrganizationMember(formData: FormData) {
  const {db}=await requireSuperAdmin(); const organizationId=textValue(formData,'organization_id'),userId=textValue(formData,'user_id'); if(!organizationId||!userId)throw new Error('بيانات إزالة العضوية غير صالحة.');
  const {error}=await db.from('organization_members').delete().eq('organization_id',organizationId).eq('user_id',userId); if(error)dbError('تعذر إزالة عضوية المؤسسة',error); revalidatePath('/admin/control');finish('تمت إزالة عضوية المؤسسة.');
}


export async function saveCompanyContent(formData: FormData) {
  const { db, user } = await requireSuperAdmin();
  const id = textValue(formData,'id');
  const contentType = textValue(formData,'content_type');
  const slug = textValue(formData,'slug');
  const title = textValue(formData,'title');
  if (!['about','vision','mission','activity','project','portfolio','news','faq'].includes(contentType) || !slug || !title) {
    throw new Error('بيانات محتوى الشركة غير صالحة.');
  }
  const payload = {
    content_type: contentType,
    slug,
    title,
    excerpt: textValue(formData,'excerpt'),
    body: textValue(formData,'body'),
    sort_order: Number(formData.get('sort_order') || 0),
    published: formData.get('published') === 'on',
    published_at: formData.get('published') === 'on' ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  };
  const result = id ? await db.from('company_content').update(payload).eq('id',id) : await db.from('company_content').insert(payload);
  if (result.error) dbError('تعذر حفظ محتوى الشركة', result.error);
  await audit(db,user.id,id?'UPDATE':'CREATE','company_content',id || slug,{contentType,slug});
  revalidatePath('/company');
  revalidatePath('/company/'+contentType);
  revalidatePath('/admin/control');
  finish(id ? 'تم تحديث محتوى الشركة.' : 'تم إنشاء محتوى الشركة.');
}

export async function deleteCompanyContent(formData: FormData) {
  const { db, user } = await requireSuperAdmin();
  const id = textValue(formData,'id');
  if (!id) throw new Error('معرّف المحتوى غير صالح.');
  const { error } = await db.from('company_content').delete().eq('id',id);
  if (error) dbError('تعذر حذف محتوى الشركة', error);
  await audit(db,user.id,'DELETE','company_content',id);
  revalidatePath('/company');
  revalidatePath('/admin/control');
  finish('تم حذف محتوى الشركة.');
}


export async function savePaymentProviderConfig(formData: FormData) {
  const { db, user } = await requireSuperAdmin();
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
  if (!id || !providerKey || !displayName || !['sandbox','live'].includes(mode)) throw new Error('بيانات بوابة الدفع غير صالحة.');

  const { data: current, error: readError } = await db.from('payment_provider_configs').select('config_data').eq('id',id).single();
  if (readError) dbError('تعذر قراءة إعدادات بوابة الدفع', readError);
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
  if (error) dbError('تعذر حفظ إعدادات بوابة الدفع', error);
  await audit(db,user.id,'UPDATE','payment_provider_configs',id,{providerKey,enabled,mode});
  revalidatePath('/admin/control');
  finish('تم حفظ إعدادات بوابة الدفع.');
}

export async function transitionServiceRequest(formData: FormData) {
  const { db, user } = await requireSuperAdmin();
  const requestId = textValue(formData, 'request_id');
  const toStatus = textValue(formData, 'to_status');
  const note = textValue(formData, 'note');
  if (!requestId || !toStatus) throw new Error('بيانات انتقال طلب الخدمة غير صالحة.');
  const { error } = await db.rpc('transition_service_request', { p_request_id: requestId, p_to_status: toStatus, p_note: note });
  if (error) dbError('تعذر تغيير حالة طلب الخدمة', error);
  await audit(db, user.id, 'UPDATE', 'service_requests', requestId, { toStatus, note });
  revalidatePath('/admin/services');
  revalidatePath('/service-requests');
  finish('تم تحديث حالة طلب الخدمة.');
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
