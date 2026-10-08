import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

type InventoryRow = {
  id: number;
  product_id: number;
  sku: string | null;
  quantity_on_hand: number;
  quantity_reserved: number;
  reorder_level: number;
  status: 'active' | 'inactive';
  updated_at: string;
  products: { name: string | null; slug: string | null }[];
};

export default async function InventoryPage() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/admin/login');
  const { data: isSuperAdmin } = await db.rpc('has_role', { role_key: 'super_admin' });
  if (!isSuperAdmin) redirect('/');

  const { data } = await db
    .from('inventory_items')
    .select('id,product_id,sku,quantity_on_hand,quantity_reserved,reorder_level,status,updated_at,products(name,slug)')
    .order('updated_at', { ascending: false });

  const rows = (data ?? []) as InventoryRow[];

  return (
    <main className="section">
      <div className="wrap">
        <Link href="/admin/control">← الإدارة</Link>
        <span className="kicker" style={{ display: 'block', marginTop: 24 }}>M13 / INVENTORY</span>
        <h1>المخزون</h1>
        <p className="muted">أساس المخزون والحركات والحجز، مرتبط مباشرة بالمنتجات الحالية.</p>
        <div className="grid" style={{ marginTop: 24 }}>
          {rows.map((x) => (
            <article className="card" key={x.id}>
              <h2>{x.products[0]?.name ?? x.product_id}</h2>
              <p>المتاح: {x.quantity_on_hand} · محجوز: {x.quantity_reserved}</p>
              <p>حد إعادة الطلب: {x.reorder_level} · الحالة: {x.status}</p>
            </article>
          ))}
          {!rows.length && (
            <article className="card">
              <h2>لا توجد سجلات مخزون بعد.</h2>
              <p>يمكن إنشاء سجل مخزون للمنتجات من طبقة الإدارة.</p>
            </article>
          )}
        </div>
      </div>
    </main>
  );
}
