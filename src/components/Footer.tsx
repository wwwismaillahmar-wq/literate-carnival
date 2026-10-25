import Link from 'next/link';
import { site } from '@/lib/config';
import { createClient } from '@/lib/supabase/server';
import { serverLocale } from '@/lib/i18n/content.server';

export async function Footer() {
  const locale = await serverLocale();
  const labels = {"ar":["بوابة للمنتجات والخدمات المهنية والتكوين والتعاون. لكل قطاع فضاؤه ووظائفه الخاصة.","اكتشف ASLAN","السوق والمنتجات","الخدمات","الأكاديمية","المجتمع","عن المجموعة","فرص ومجالات","المتاجر","مكتب التاجر","الشراكات","الكفاءات المهنية","الموسوعة التقنية","الدعم والمعلومات","دليل الاستخدام","دليل الإدارة والأدوار","القواعد والمعاملات","المساعدة والشكاوى","تواصل معنا"],"en":["Products, services, training and collaboration.","Discover ASLAN","Market and products","Services","Academy","Community","About us","Opportunities","Stores","Seller desk","Partnerships","Professional talent","Technical encyclopedia","Support and information","User guide","Management and roles","Rules and transactions","Help and complaints","Contact us"],"fr":["Produits, services, formation et collaboration.","Découvrir ASLAN","Marché et produits","Services","Académie","Communauté","À propos","Opportunités","Boutiques","Espace vendeur","Partenariats","Talents professionnels","Encyclopédie technique","Assistance et informations","Guide utilisateur","Gestion et rôles","Règles et transactions","Aide et réclamations","Nous contacter"],"es":["Productos, servicios, formación y colaboración.","Descubre ASLAN","Mercado y productos","Servicios","Academia","Comunidad","Sobre nosotros","Oportunidades","Tiendas","Panel del vendedor","Alianzas","Talento profesional","Enciclopedia técnica","Ayuda e información","Guía de usuario","Gestión y roles","Normas y transacciones","Ayuda y reclamaciones","Contacto"],"de":["Produkte, Dienstleistungen, Ausbildung und Zusammenarbeit.","ASLAN entdecken","Markt und Produkte","Dienstleistungen","Akademie","Community","Über uns","Möglichkeiten","Shops","Verkäuferbereich","Partnerschaften","Fachkräfte","Technisches Lexikon","Hilfe und Informationen","Benutzerhandbuch","Verwaltung und Rollen","Regeln und Transaktionen","Hilfe und Beschwerden","Kontakt"],"pt":["Produtos, serviços, formação e colaboração.","Descubra ASLAN","Mercado e produtos","Serviços","Academia","Comunidade","Sobre nós","Oportunidades","Lojas","Área do vendedor","Parcerias","Talentos profissionais","Enciclopédia técnica","Apoio e informações","Guia de utilização","Gestão e funções","Regras e transações","Ajuda e reclamações","Contacte-nos"]};
  const t=(index:number)=>labels[locale][index];
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
          <p className="footer-description">{t(0)}</p>
        </div>
        <nav className="footer-column" aria-label="بوابات المؤسسة">
          <strong className="footer-title">{t(1)}</strong>
          <Link href="/market">{t(2)}</Link>
          <Link href="/services">{t(3)}</Link>
          <Link href="/academy">{t(4)}</Link>
          <Link href="/community">{t(5)}</Link>
          <Link href="/company">{t(6)}</Link>
        </nav>
        <nav className="footer-column" aria-label="الفرص والتعاون">
          <strong className="footer-title">{t(7)}</strong>
          <Link href="/market/stores">{t(8)}</Link>
          <Link href="/market/sell">{t(9)}</Link>
          <Link href="/partners">{t(10)}</Link>
          <Link href="/talent">{t(11)}</Link>
          <Link href="/encyclopedia">{t(12)}</Link>
        </nav>
        <nav className="footer-column" aria-label="الإرشاد والدعم">
          <strong className="footer-title">{t(13)}</strong>
          <Link href="/guides">{t(14)}</Link>
          <Link href="/guides/management">{t(15)}</Link>
          <Link href="/guides/rules">{t(16)}</Link>
          <Link href="/support">{t(17)}</Link>
          <Link href="/contact">{t(18)}</Link>
        </nav>
      </div>
      <div className="footer-bottom"><span>{footerText}</span><span>ASLAN · نحوّل الحرفة إلى علامة، والتصميم إلى قيمة.</span></div>
    </div>
  </footer>;
}
