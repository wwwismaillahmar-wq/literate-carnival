import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AssistantClient from './AssistantClient';

export const dynamic = 'force-dynamic';

export default async function AslanAssistantPage() {
  const db = await createClient();
  const { data: { user }, error } = await db.auth.getUser();
  if (error || !user) redirect('/admin/login?next=/admin/aslan-assistant');
  const { data: permitted, error: roleError } = await db.rpc('has_role', { role_key: 'super_admin' });
  if (roleError || permitted !== true) redirect('/');
  return <AssistantClient />;
}
