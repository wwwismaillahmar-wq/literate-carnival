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
  const payload = {
    name,
    slug,
    description: textValue(formData, 'description'),
    price_dzd: Number(formData.get('price_dzd') || 0) || null,
    stock: Math.max(0, Number(formData.get('stock') || 0)),
    active: formData.get('active') === 'on',
    category_id: nullableText(formData, 'category_id') ? Number(formData.get('category_id')) : null,
  };
  if (id) await db.from('products').update(payload).eq('id', Number(id));
  else await db.from('products').insert(payload);
  revalidatePath('/admin/dashboard');
  revalidatePath('/admin/control');
}

export async function deleteProduct(formData: FormData) {
  const { db } = await requireSuperAdmin();
  const id = Number(formData.get('id'));
  if (id) await db.from('products').delete().eq('id', id);
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

export async function savePermission(formData: FormData) {
  const { db } = await requireSuperAdmin();
  const key = textValue(formData, 'key');
  const name = textValue(formData, 'name');
  if (!key || !name) return;
  await db.from('permissions').upsert({
    key,
    name,
    description: textValue(formData, 'description'),
  }, { onConflict: 'key' });
  revalidatePath('/admin/dashboard');
  revalidatePath('/admin/control');
}

export async function assignUserRole(formData: FormData) {
  const { db } = await requireSuperAdmin();
  const userId = textValue(formData, 'user_id');
  const roleId = textValue(formData, 'role_id');
  if (!userId || !roleId) return;
  await db.from('user_roles').upsert({ user_id: userId, role_id: roleId }, { onConflict: 'user_id,role_id' });
  revalidatePath('/admin/dashboard');
  revalidatePath('/admin/control');
}

export async function removeUserRole(formData: FormData) {
  const { db } = await requireSuperAdmin();
  const userId = textValue(formData, 'user_id');
  const roleId = textValue(formData, 'role_id');
  if (userId && roleId) await db.from('user_roles').delete().eq('user_id', userId).eq('role_id', roleId);
  revalidatePath('/admin/dashboard');
  revalidatePath('/admin/control');
}

export async function saveOrganization(formData: FormData) {
  const { db } = await requireSuperAdmin();
  const id = textValue(formData, 'id');
  const name = textValue(formData, 'name');
  const slug = textValue(formData, 'slug');
  const type = textValue(formData, 'type');
  const status = textValue(formData, 'status') || 'active';
  if (!name || !slug || !['company','academy','partner','internal','community'].includes(type)) return;
  const payload = { name, slug, type, status };
  if (id) await db.from('organizations').update(payload).eq('id', id);
  else await db.from('organizations').insert(payload);
  revalidatePath('/admin/dashboard');
  revalidatePath('/admin/control');
}
