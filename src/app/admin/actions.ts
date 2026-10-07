'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

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

export async function saveProduct(formData: FormData) {
  const { db } = await requireSuperAdmin();
  const id = textValue(formData, 'id');
  const name = textValue(formData, 'name');
  const slug = textValue(formData, 'slug');
  if (!name || !slug) return;
  const adPriority = Math.min(100, Math.max(0, Number(formData.get('ad_priority') || 0) || 0));
  const payload = {
    name,
    slug,
    description: textValue(formData, 'description'),
    price_dzd: Number(formData.get('price_dzd') || 0) || null,
    stock: Math.max(0, Number(formData.get('stock') || 0)),
    active: formData.get('active') === 'on',
    category_id: nullableText(formData, 'category_id') ? Number(formData.get('category_id')) : null,
    ad_priority: adPriority,
    home_featured: formData.get('home_featured') === 'on',
  };
  if (id) await db.from('products').update(payload).eq('id', Number(id));
  else await db.from('products').insert(payload);
  revalidatePath('/');
  revalidatePath('/products');
  revalidatePath('/admin/dashboard');
  revalidatePath('/admin/control');
}

export async function uploadProductMedia(formData: FormData) {
  const { db, user } = await requireSuperAdmin();
  const productId = Number(formData.get('product_id'));
  const file = formData.get('file');
  if (!productId || !(file instanceof File) || file.size === 0) return;
  const allowed = ['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime'];
  if (!allowed.includes(file.type) || file.size > 50 * 1024 * 1024) return;

  const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
  const objectPath = `${user.id}/products/${productId}/${crypto.randomUUID()}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await db.storage.from('aslan-media').upload(objectPath, bytes, {
    contentType: file.type,
    upsert: false,
  });
  if (uploadError) return;

  const mediaType = file.type.startsWith('video/') ? 'video' : 'image';
  const { error: mediaError } = await db.from('media_assets').insert({
    owner_id: user.id,
    product_id: productId,
    bucket_id: 'aslan-media',
    object_path: objectPath,
    media_type: mediaType,
    mime_type: file.type,
    file_size: file.size,
  });
  if (mediaError) {
    await db.storage.from('aslan-media').remove([objectPath]);
    return;
  }

  revalidatePath('/');
  revalidatePath('/admin/control');
  revalidatePath('/admin/dashboard');
}

export async function deleteProductMedia(formData: FormData) {
  const { db } = await requireSuperAdmin();
  const id = String(formData.get('id') || '');
  if (!id) return;
  const { data: media } = await db.from('media_assets').select('bucket_id,object_path,product_id').eq('id', id).maybeSingle();
  if (!media) return;
  await db.storage.from(media.bucket_id).remove([media.object_path]);
  await db.from('media_assets').delete().eq('id', id);
  revalidatePath('/');
  revalidatePath('/admin/control');
}

export async function deleteProduct(formData: FormData) {
  const { db } = await requireSuperAdmin();
  const id = Number(formData.get('id'));
  if (id) await db.from('products').delete().eq('id', id);
  revalidatePath('/');
  revalidatePath('/admin/dashboard');
  revalidatePath('/admin/control');
}

export async function saveCategory(formData: FormData) {
  const { db } = await requireSuperAdmin();
  const id = textValue(formData, 'id');
  const name = textValue(formData, 'name');
  const slug = textValue(formData, 'slug');
  if (!name || !slug) return;
  const payload = { name, slug };
  if (id) await db.from('categories').update(payload).eq('id', Number(id));
  else await db.from('categories').insert(payload);
  revalidatePath('/admin/dashboard');
  revalidatePath('/admin/control');
}

export async function deleteCategory(formData: FormData) {
  const { db } = await requireSuperAdmin();
  const id = Number(formData.get('id'));
  if (id) await db.from('categories').delete().eq('id', id);
  revalidatePath('/admin/dashboard');
  revalidatePath('/admin/control');
}

export async function updateLeadStatus(formData: FormData) {
  const { db } = await requireSuperAdmin();
  const id = Number(formData.get('id'));
  const status = textValue(formData, 'status');
  if (id && ['new', 'contacted', 'qualified', 'closed'].includes(status)) {
    await db.from('leads').update({ status }).eq('id', id);
  }
  revalidatePath('/admin/dashboard');
  revalidatePath('/admin/control');
}

export async function updatePost(formData: FormData) {
  const { db, user } = await requireSuperAdmin();
  const id = textValue(formData, 'id');
  const status = textValue(formData, 'status');
  if (!id || !['draft','pending','needs_revision','accepted','published','rejected','archived'].includes(status)) return;
  const featured = formData.get('featured') === 'on';
  await db.from('posts').update({
    status,
    featured,
    featured_by: featured ? user.id : null,
    featured_at: featured ? new Date().toISOString() : null,
  }).eq('id', id);
  revalidatePath('/admin/dashboard');
  revalidatePath('/admin/control');
}

export async function updateContribution(formData: FormData) {
  const { db, user } = await requireSuperAdmin();
  const id = textValue(formData, 'id');
  const status = textValue(formData, 'status');
  if (!id || !['pending','needs_revision','accepted','published','rejected'].includes(status)) return;
  const featured = formData.get('featured') === 'on';
  await db.from('contributions').update({
    status,
    featured,
    featured_by: featured ? user.id : null,
    featured_at: featured ? new Date().toISOString() : null,
    published_at: status === 'published' ? new Date().toISOString() : null,
  }).eq('id', id);
  revalidatePath('/admin/dashboard');
  revalidatePath('/admin/control');
}

export async function saveRole(formData: FormData) {
  const { db } = await requireSuperAdmin();
  const id = textValue(formData, 'id');
  const key = textValue(formData, 'key');
  const name = textValue(formData, 'name');
  if (!key || !name) return;
  const payload = { key, name, description: textValue(formData, 'description') };
  if (id) await db.from('roles').update(payload).eq('id', id);
  else await db.from('roles').insert(payload);
  revalidatePath('/admin/dashboard');
  revalidatePath('/admin/control');
}
