import Link from 'next/link';
import { site } from '@/lib/config';
import { createClient } from '@/lib/supabase/server';

export async function Footer() {
  const db = await createClient();
  const { data } = await db.from('site_settings').select('setting_key,setting_value').eq('is_public',true);
  const settings = new Map((data??[]).map(row=>[row.setting_key,row.setting_value]));
  const tagline = settings.get('brand_tagline') || site.tagline;
  const footerText = settings.get('footer_text') || '© 2026 ASLAN MODELLING';
  return <footer className="aslan-footer" aria-label="تذييل موقع ASLAN">
    <div className="wrap">
      <div className="footer-grid">
        <div>
          <Link href="/" className="footer-brand">ASLAN <small style={{fontSize:13,letterSpacing:'.03em'}}>MODELLING GROUP</small></Link>
          <p className="footer-description">{tagline}</p>
          <p className="footer-description">بوابة للمنتجات والخدمات المهنية والتكوين والتعاون. لكل قطاع فضاؤه ووظائفه الخاصة.</p>
        </div>
        <nav className="footer-column" aria-label="بوابات المؤسسة">
          <strong className="footer-title">اكتشف ASLAN</strong>
          <Link href="/market">السوق والمنتجات</Link>
          <Link href="/services">الخدمات</Link>
          <Link href="/academy">الأكاديمية</Link>
          <Link href="/community">المجتمع</Link>
          <Link href="/company">عن المجموعة</Link>
        </nav>
        <nav className="footer-column" aria-label="الفرص والتعاون">
          <strong className="footer-title">فرص ومجالات</strong>
          <Link href="/market/stores">المتاجر</Link>
          <Link href="/market/sell">مكتب التاجر</Link>
          <Link href="/partners">الشراكات</Link>
          <Link href="/talent">الكفاءات المهنية</Link>
          <Link href="/encyclopedia">الموسوعة التقنية</Link>
        </nav>
        <nav className="footer-column" aria-label="الإرشاد والدعم">
          <strong className="footer-title">الدعم والمعلومات</strong>
          <Link href="/guides">دليل الاستخدام</Link>
          <Link href="/guides/management">دليل الإدارة والأدوار</Link>
          <Link href="/guides/rules">القواعد والمعاملات</Link>
          <Link href="/support">المساعدة والشكاوى</Link>
          <Link href="/contact">تواصل معنا</Link>
        </nav>
      </div>
      <div className="footer-bottom"><span>{footerText}</span><span>ASLAN · نحوّل الحرفة إلى علامة، والتصميم إلى قيمة.</span></div>
    </div>
  </footer>;
}
