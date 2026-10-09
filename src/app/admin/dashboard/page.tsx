import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import LogoutButton from '@/components/LogoutButton';
import { ADMIN_APPLICATIONS } from '../applications';

export const dynamic = 'force-dynamic';

type Row = Record<string, unknown>;

export default async function Dashboard() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/admin/login');

  const [{ data: profile }, { data: isSuperAdmin, error: authorizationError }] =
    await Promise.all([
      db.from('profiles').select('full_name,username').eq('id', user.id).maybeSingle(),
      db.rpc('has_role', { role_key: 'super_admin' }),
    ]);

  if (authorizationError || !isSuperAdmin) redirect('/');

  const [
    { count: users }, { count: roles }, { count: permissions }, { count: organizations },
    { count: products }, { count: categories }, { count: leads }, { count: posts },
    { count: contributions }, { count: conversations }, { count: messages }, { count: gallery },
  ] = await Promise.all([
    db.from('profiles').select('*', { count: 'exact', head: true }),
    db.from('roles').select('*', { count: 'exact', head: true }),
    db.from('permissions').select('*', { count: 'exact', head: true }),
    db.from('organizations').select('*', { count: 'exact', head: true }),
    db.from('products').select('*', { count: 'exact', head: true }),
    db.from('categories').select('*', {¶»§q«^