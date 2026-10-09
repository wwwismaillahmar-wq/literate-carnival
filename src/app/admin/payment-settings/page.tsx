import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { savePaymentProviderConfig } from '../actions';

export const dynamic = 'force-dynamic';

type Provider = { id: string; provider_key: string; display_name: string; enabled: boolean; mode: string; config_data: Record<string, unknown> | null };

function textConfig(config: Record<string, unknown> | null, key: string) {
  const value = config?.[key];
  return typeof value === 'string' ? value : '';
}

export default async function PaymentSettings({ searchParams }: { searchParams?: Promise<{ success?: string; error?: string }> }) {
  const params = searchParams ? await searchParams : {};
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/admin/login');
  const { data: isSuperAdmin, error: authError } = await db.rpc('has_role', { role_key: 'super_admin' });
  if (authError || isSuperAdmin !== true) redirect('/');
  const { data, error } = await db.from('payment_provider_configs').select('id,provider_key,display_name,enabled,mode,config_data').order('sort_order').order('display_name');
  const providers = (data ?? []) as Provider[];

  return <main className="section"><div className="wrap">
    <div style={{display:'flex',justifyContent:'space-between',gap:16,alignItems:'center',flexWrap:'wrap'}}><div><span className="kicker">M15 / PAYMENT CONFIGURATION</span><h1>إعدادات بوابات الدفع</h1><p className="muted">إدارة بيانات التاجر ووضع التشغيل. لا نعرض مفاتيح السر الحالية أبدًا؛ اتركها فارغة للحفاظ على القيمة المحفوظة.</p></div><Link className="card" href="/admin/control">بوابة الإدارة</Link></div>
    {params.success && <div className="card" style={{marginTop:16,border:'1px solid #2f855a'}}><strong>✓ {params.success}</strong></div>}
    {params.error && <div className="card" style={{marginTop:16,border:'1px solid #c53030'}}><strong>✕ {params.error}</strong></div>}
    {error && <div className="card" style={{marginTop:16,border:'1px solid #c53030'}}><strong>تعذر تحميل إعدادات الدفع: {error.message}</strong></div>}
    <div style={{display:'grid',gap:16,marginTop:24}}>{providers.map((provider)=><form action={savePaymentProviderConfig} className="card" key={provider.id} style={{display:'grid',gap:12}}>
      <input type="hidden" name="id" value={provider.id}/><input type="hidden" name="provider_key" value={provider.provider_key}/>
      <div style={{display:'flex',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}><div><span className="kicker">{provider.provider_key}</span><h2>{provider.display_name}</h2></div><span className="market-stock">{provider.enabled ? 'مفعّلة' : 'متوقفة'} · {provider.mode}</span></div>
      <div className="grid two">
        <label>اسم البوابة<input name="display_name" defaultValue={provider.display_name} required/></label>
        <label>وضع التشغيل<select name="mode" defaultValue={provider.mode}><option value="sandbox">Sandbox / تجريبي</option><option value="live">Live / فعلي</option></select></label>
      </div>
      <label><input type="checkbox" name="enabled" defaultChecked={provider.enabled}/> تفعيل البوابة</label>
      <div className="grid two">
        <label>رقم التاجر<input name="merchant_id" defaultValue={textConfig(provider.config_data,'merchant_id')} placeholder="Merchant ID"/></label>
        <label>المفتاح العام<input name="public_key" defaultValue={textConfig(provider.config_data,'public_key')} placeholder="Public key"/></label>
      </div>
      <div className="grid two">
        <label>مفتاح API (اتركه فارغًا للإبقاء عليه)<input name="api_key" type="password" autoComplete="new-password" placeholder={provider.config_data?.api_key ? 'مفتاح محفوظ — لا يُعرض' : 'API key'}/></label>
        <label>المفتاح السري (اتركه فارغًا للإبقاء عليه)<input name="secret_key" type="password" autoComplete="new-password" placeholder={provider.config_data?.secret_key ? 'مفتاح محفوظ — لا يُعرض' : 'Secret key'}/></label>
      </div>
      <label>تعليمات الدفع اليدوي أو معلومات التحويل<textarea name="instructions" rows={3} defaultValue={textConfig(provider.config_data,'instructions')} placeholder="تعليمات تظهر للعميل إذا كانت البوابة تدعم الدفع اليدوي"/></label>
      <button type="submit">حفظ إعدادات {provider.display_name}</button>
    </form>)}
    {!providers.length && <article className="card"><p>لا توجد بوابات دفع مُعرّفة في قاعدة البيانات.</p></article>}</div>
  </div></main>;
}
