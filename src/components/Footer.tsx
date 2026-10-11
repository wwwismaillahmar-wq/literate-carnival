import Link from 'next/link';
import { site } from '@/lib/config';
import { createClient } from '@/lib/supabase/server';

export async function Footer() {
  const db = await createClient();
  const { data } = await db.from('site_settings').select('setting_key,setting_value').eq('is_public', true);
  const settings = new Map((data ?? []).map(row => [row.setting_key, row.setting_value]));
  const tagline = settings.get('brand_tagline') || site.tagline;
  const footerText = settings.get('footer_text') || '© 2026 ASLAN MODELLING';

  return (
    <footer className="section dark" style={{ padding: '40px 0' }}>
      <div className="wrap" style={{ display: 'grid', gap: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
          <div><strong className="gold">{site.name}</strong><div className="muted">{tagline}</div></div>
          <div className="muted">{footerText}</div>
        </div>
        <nav aria-label="روابط إضافية" style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <Link href="/encyclopedia">الموسوعة العلمية والتقنية</Link>
          <Link href="/talent">الكفاءات المهنية</Link>
          <Link href="/partners">الشراكات</Link>
          <Link href="/contact">التواصل</Link>
        </nav>
      </div>
    </footer>
  );
}
