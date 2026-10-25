import Link from 'next/link';
import {cookies} from 'next/headers';
import {resolveLocale} from '@/lib/i18n/core';
import { ArrowLeft, ArrowUpLeft, BookOpen, BriefcaseBusiness, Handshake, PackageCheck, ShieldCheck, ShoppingBag, TrendingUp, BadgePercent, UsersRound, Wrench } from 'lucide-react';
import styles from './HomeExperience.module.css';
import { site } from '@/lib/config';
import { getHomepageProducts } from '@/lib/data';
import { createClient } from '@/lib/supabase/server';
import SocialPost, { type SocialPostData } from '@/components/SocialPost';
import { HomeAcademySection } from '@/components/academy/HomeAcademySection';
import { HomeProductCarousel } from '@/components/HomeProductCarousel';
import { AslanBrandMark } from '@/components/AslanBrandMark';

const homeUi:Record<string,string[]>={"ar":["استكشف السوق","اطلب خدمة","منتجات وأعمال","خدمات تنفيذية","تعليم مهني","اكتشف المجموعة","إلى أين تريد الذهاب؟","بوابات مستقلة بحسب ما تريد إنجازه.","اكتشف سوق المنتجات","منتجات ASLAN والمتاجر المعتمدة، منفصلة عن خدمات التنفيذ.","الذهاب إلى السوق","خدمات مهنية تلائم احتياجك","جميع الخدمات","من المجتمع المهني","ادخل المجتمع","تواصل مع ASLAN","السوق","الخدمات","الأكاديمية","الشراكات","المجتمع","منتجات جاهزة ومخصصة","حلول تنفيذية ومهنية","تكوين مهني وتقني","تعاون وفرص مشتركة","خبرات ومشاريع مهنية","نبني الجودة.","نصنع الثقة.","تنجيد • خياطة • تفصيل — منتجات مخصصة، خدمات تنفيذية، وتكوين مهني ضمن منظومة ASLAN.","تصميم","تنفيذ","خدمات","تدريب","شراكات"],"fr":["Explorez le marché","Demander un service","Produits et réalisations","Services professionnels","Formation professionnelle","Découvrez le groupe","Où souhaitez-vous aller ?","Des espaces dédiés à vos besoins.","Découvrez les produits","Les produits ASLAN et les boutiques agréées, distincts des services.","Voir le marché","Services professionnels adaptés à vos besoins","Tous les services","Communauté professionnelle","Accéder à la communauté","Contacter ASLAN","Marché","Services","Académie","Partenariats","Communauté","Produits prêts et personnalisés","Solutions professionnelles","Formation professionnelle et technique","Coopération et partenariats","Expertise et projets professionnels","Notre engagement qualité.","Votre confiance, notre priorité.","Sellerie • couture • sur mesure — produits, services et formation ASLAN.","Conception","Réalisation","Services","Formation","Partenariats"],"en":["Explore the market","Request a service","Products and projects","Professional services","Vocational training","Explore the group","Where would you like to go?","Dedicated spaces for what you need.","Explore products","ASLAN products and approved stores, separate from services.","Go to market","Professional services tailored to your needs","All services","Professional community","Enter community","Contact ASLAN","Market","Services","Academy","Partnerships","Community","Ready-made and custom products","Professional services and solutions","Vocational and technical training","Collaboration and partnerships","Expertise and professional projects","Built on quality.","Driven by trust.","Upholstery • sewing • tailoring — custom products, services and training at ASLAN.","Design","Delivery","Services","Training","Partnerships"],"es":["Explorar el mercado","Solicitar un servicio","Productos y proyectos","Servicios profesionales","Formación profesional","Descubra el grupo","¿Adónde desea ir?","Espacios dedicados a sus necesidades.","Descubra los productos","Productos ASLAN y tiendas autorizadas, separados de los servicios.","Ir al mercado","Servicios profesionales para sus necesidades","Todos los servicios","Comunidad profesional","Entrar en la comunidad","Contactar con ASLAN","Mercado","Servicios","Academia","Alianzas","Comunidad","Productos listos y personalizados","Servicios y soluciones profesionales","Formación profesional y técnica","Colaboración y alianzas","Experiencia y proyectos profesionales","Construimos calidad.","Creamos confianza.","Tapicería • costura • confección — productos, servicios y formación ASLAN.","Diseño","Ejecución","Servicios","Formación","Alianzas"],"de":["Markt entdecken","Dienstleistung anfragen","Produkte und Projekte","Professionelle Dienstleistungen","Berufliche Weiterbildung","Gruppe entdecken","Wohin möchten Sie?","Eigenständige Bereiche für Ihre Anliegen.","Produkte entdecken","ASLAN-Produkte und zugelassene Shops, getrennt von Dienstleistungen.","Zum Markt","Professionelle Dienstleistungen für Ihren Bedarf","Alle Dienstleistungen","Berufliche Community","Zur Community","ASLAN kontaktieren","Markt","Dienstleistungen","Akademie","Partnerschaften","Community","Fertige und maßgeschneiderte Produkte","Professionelle Dienstleistungen","Berufliche und technische Ausbildung","Zusammenarbeit und Partnerschaften","Fachwissen und berufliche Projekte","Wir schaffen Qualität.","Wir schaffen Vertrauen.","Polsterei • Nähen • Maßanfertigung — Produkte, Dienstleistungen und Ausbildung bei ASLAN.","Design","Umsetzung","Service","Ausbildung","Partnerschaften"],"pt":["Explorar o mercado","Solicitar um serviço","Produtos e projetos","Serviços profissionais","Formação profissional","Conheça o grupo","Para onde pretende ir?","Espaços dedicados às suas necessidades.","Descubra os produtos","Produtos ASLAN e lojas aprovadas, separados dos serviços.","Ir ao mercado","Serviços profissionais adaptados às suas necessidades","Todos os serviços","Comunidade profissional","Entrar na comunidade","Contactar a ASLAN","Mercado","Serviços","Academia","Parcerias","Comunidade","Produtos prontos e personalizados","Serviços e soluções profissionais","Formação profissional e técnica","Colaboração e parcerias","Experiência e projetos profissionais","Construímos qualidade.","Criamos confiança.","Estofamento • costura • confeção — produtos, serviços e formação ASLAN.","Design","Execução","Serviços","Formação","Parcerias"]};
export default async function HomePage(){
  const locale=resolveLocale((await cookies()).get('aslan-language')?.value);
  const ui=(index:number)=>homeUi[locale]?.[index]||homeUi.ar[index];
  const products=await getHomepageProducts();
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  const {data: settingRows}=await supabase.from('site_settings').select('setting_key,setting_value').eq('is_public',true);
  const siteSettings=new Map((settingRows??[]).map(row=>[row.setting_key,row.setting_value]));
  const homeEyebrow=siteSettings.get('home_eyebrow')||site.name;
  const homeTitlePrimary=siteSettings.get('home_title_primary')||ui(26);
  const homeTitleAccent=siteSettings.get('home_title_accent')||ui(27);
  const homeSubtitle=siteSettings.get('home_subtitle')||ui(28);
  const announcementText=siteSettings.get('announcement_text')||'';
  const {data:featuredPosts}=await supabase.from('posts').select('id,author_id,title,content,visibility,status,created_at,published_at,featured,featured_order').eq('status','published').eq('visibility','public').eq('featured',true).order('featured_order',{ascending:true}).order('featured_at',{ascending:false}).limit(6);
  const {data:featuredContributions}=await supabase.from('contributions').select('id,user_id,title,content,visibility,status,created_at,published_at,featured,featured_order').eq('status','published').eq('visibility','public').eq('featured',true).order('featured_order',{ascending:true}).order('featured_at',{ascending:false}).limit(6);

  const authorIds=[...new Set([
    ...(featuredPosts??[]).map(p=>p.author_id),
    ...(featuredContributions??[]).map(c=>c.user_id),
  ])];
  const {data:authors}=authorIds.length?await supabase.from('profiles').select('id,full_name,username,role,avatar_path').in('id',authorIds):{data:[]};
  const authorMap=new Map((authors??[]).map(a=>[a.id,a]));

  async function enrichContent(item:{id:string;author_id:string;title:string;content:string;visibility:string;status:string;created_at:string;published_at:string|null;featured:boolean;featured_order:number}, mediaColumn:'post_id'|'contribution_id'){
    const author=authorMap.get(item.author_id); let avatar_url=null;
    if(author?.avatar_path){const s=await supabase.storage.from('aslan-media').createSignedUrl(author.avatar_path,3600); avatar_url=s.data?.signedUrl??null;}
    const {data:media}=await supabase.from('media_assets').select('id,media_type,mime_type,object_path').eq(mediaColumn,item.id).eq('upload_status','uploaded').order('created_at',{ascending:true}).limit(8);
    const rendered=[]; for(const mediaItem of media??[]){const s=await supabase.storage.from('aslan-media').createSignedUrl(mediaItem.object_path,3600); rendered.push({...mediaItem,signed_url:s.data?.signedUrl??null});}
    return {...item,author,avatar_url,media:rendered,viewerIsOwner:false,viewerAuthenticated:!!user};
  }

  const posts=[
    ...await Promise.all((featuredPosts??[]).map(post=>enrichContent({...post,author_id:post.author_id},'post_id'))),
    ...await Promise.all((featuredContributions??[]).map(item=>enrichContent({...item,author_id:item.user_id},'contribution_id'))),
  ];
  // Public services only. Products and courses are still shown only when actually published.
  const { data: publicServices } = await supabase.from('services')
    .select('id,name,slug,description').eq('active',true).order('name').limit(4);
  const portals = [
    {href:'/market',title:ui(16),english:'MARKET',description:ui(21),icon:ShoppingBag,theme:'market'},
    {href:'/services',title:ui(17),english:'SERVICES',description:ui(22),icon:Wrench,theme:'services'},
    {href:'/academy',title:ui(18),english:'ACADEMY',description:ui(23),icon:BookOpen,theme:'academy'},
    {href:'/market/stores',title:'التسويق',english:'MARKETING',description:'متاجر وفرص انتشار الأعمال',icon:TrendingUp,theme:'marketing'},
    {href:'/market/quote',title:'المبيعات',english:'SALES',description:'طلبات وعروض أسعار',icon:BadgePercent,theme:'sales'},
    {href:'/partners',title:ui(19),english:'PARTNERSHIPS',description:ui(24),icon:Handshake,theme:'partners'},
    {href:'/community',title:ui(20),english:'COMMUNITY',description:ui(25),icon:UsersRound,theme:'community'},
  ] as const;

  return <main className={styles.home}>
    {announcementText && <section className={styles.announcement} aria-label="إعلان المؤسسة">
      <div className={styles.wrap}><span>إعلان ASLAN</span><p>{announcementText}</p></div>
    </section>}
    <div className={styles.wrap}>
      <section className={styles.hero} aria-label="البوابة الرئيسية للمجموعة">
        <div className={styles.heroMain}>
          <span className={styles.heroEyebrow}>{homeEyebrow}</span>
          <h1>{homeTitlePrimary} <em>{homeTitleAccent}</em></h1>
          <p>{homeSubtitle}</p>
          <div className={styles.heroButtons}>
            <Link href="/market" className={styles.goldButton}><ShoppingBag size={17} aria-hidden="true"/> استكشف السوق</Link>
            <Link href="/services" className={styles.outlineButton}>اطلب خدمة <ArrowLeft size={16} aria-hidden="true"/></Link>
          </div>
          <div className={styles.heroCapabilities}>
            <span><PackageCheck size={16} aria-hidden="true"/> منتجات وأعمال</span>
            <span><BriefcaseBusiness size={16} aria-hidden="true"/> خدمات تنفيذية</span>
            <span><BookOpen size={16} aria-hidden="true"/> تعليم مهني</span>
          </div>
        </div>
        <aside className={styles.heroAside} aria-label="هوية مجموعة ASLAN">
          <div className={styles.heroBrand}><AslanBrandMark size={104}/><div className={styles.heroWordmark}><strong>ASLAN</strong><span>MODELLING GROUP</span></div></div>
          <p className={styles.heroBrandMotto}>نحوّل الحرفة إلى علامة، والتصميم إلى قيمة.</p>
          <div className={styles.heroBrandActivities}>تصميم <i/> تنفيذ <i/> خدمات <i/> تدريب <i/> شراكات</div>
          <nav className={styles.quickRoutes} aria-label="مسارات سريعة">
            <Link href="/market"><ShoppingBag size={18}/> السوق والمنتجات <ArrowUpLeft size={17}/></Link>
            <Link href="/services"><Wrench size={18}/> الخدمات والمشاريع <ArrowUpLeft size={17}/></Link>
            <Link href="/academy"><BookOpen size={18}/> الأكاديمية <ArrowUpLeft size={17}/></Link>
            <Link href="/partners"><Handshake size={18}/> الشراكات <ArrowUpLeft size={17}/></Link>
          </nav>
        </aside>
      </section>

      <section className={styles.section} aria-labelledby="portals-heading">
        <div className={styles.sectionHeading}>
          <div><span className={styles.eyebrow}>{ui(5)}</span><h2 id="portals-heading">{ui(6)}</h2><p>{ui(7)}</p></div>
        </div>
        <div className={styles.portalGrid}>
          {portals.map(item=>{const Icon=item.icon;return <Link href={item.href} className={styles.portalCard+' '+styles['portal'+item.theme]} key={item.href}>
            <span className={styles.portalVisual}><AslanBrandMark size={67} decorative/><Icon size={36} strokeWidth={1.8} aria-hidden="true"/></span>
            <span className={styles.portalCopy}><strong>{item.title}</strong><span className={styles.portalEnglish}>{item.english}</span><small>{item.description}</small></span>
            <span className={styles.portalVisit} aria-hidden="true"><ArrowLeft size={19}/></span>
          </Link>;})}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="products-heading">
        <div className={styles.sectionHeading}>
          <div><span className={styles.eyebrow}>ASLAN MARKET</span><h2 id="products-heading">{ui(8)}</h2><p>{ui(9)}</p></div>
          <Link href="/market" className={styles.textLink}>الذهاب إلى السوق <ArrowLeft size={16} aria-hidden="true"/></Link>
        </div>
        {products.length ? <HomeProductCarousel products={products}/> : <div className={styles.marketEmpty}>
          <div className={styles.marketEmptyIcon}><ShoppingBag size={32} aria-hidden="true"/></div>
          <div><h3>بوابة التسوق جاهزة للاستكشاف</h3><p>ستظهر المنتجات هنا بعد اعتمادها ونشرها من لوحة الإدارة. استكشف الآن أقسام السوق والمتاجر وطلبات التصنيع.</p></div>
          <Link className={styles.goldButton} href="/market">استكشف السوق <ArrowLeft size={17} aria-hidden="true"/></Link>
        </div>}
      </section>
    </div>

    <HomeAcademySection/>

    <div className={styles.wrap}>
      <section className={styles.section} aria-labelledby="services-heading">
        <div className={styles.sectionHeading}>
          <div><span className={styles.eyebrow}>ASLAN SERVICES</span><h2 id="services-heading">{ui(11)}</h2><p>من طلب الخدمة إلى عرض السعر والمتابعة، ضمن فضاء مستقل.</p></div>
          <Link href="/services" className={styles.textLink}>جميع الخدمات <ArrowLeft size={16} aria-hidden="true"/></Link>
        </div>
        {(publicServices ?? []).length > 0 ? <div className={styles.serviceGrid}>
          {(publicServices ?? []).map(service=><Link href={'/services/'+encodeURIComponent(service.slug)} className={styles.serviceCard} key={service.id}>
            <span className={styles.serviceIcon}><Wrench size={24} aria-hidden="true"/></span>
            <h3>{service.name}</h3><p>{service.description}</p>
            <span>التفاصيل وطلب الخدمة <ArrowUpLeft size={16} aria-hidden="true"/></span>
          </Link>)}
        </div> : <div className={styles.panel}><h3>دليل خدمات ASLAN</h3><p>تعرّف على اختصاصات المجموعة واطلب دراسة لاحتياجك.</p><Link className={styles.textLink} href="/services">تصفح الخدمات <ArrowLeft size={16}/></Link></div>}
      </section>

      <section className={styles.section} aria-labelledby="community-heading">
        <div className={styles.sectionHeading}>
          <div><span className={styles.eyebrow}>ASLAN COMMUNITY</span><h2 id="community-heading">{ui(13)}</h2><p>مختارات من المنشورات التي أجازت الإدارة إبرازها علنًا.</p></div>
          <Link href="/community" className={styles.textLink}>ادخل المجتمع <ArrowLeft size={16} aria-hidden="true"/></Link>
        </div>
        {posts.length ? <div className={styles.communityGrid}>
          {posts.map(post=><SocialPost key={post.id} post={post as SocialPostData}/>)}
        </div> : <div className={styles.communityEmpty}>
          <div className={styles.communityIcon}><UsersRound size={30} aria-hidden="true"/></div>
          <div><h3>مساحة للتواصل وتبادل الخبرة</h3><p>تظهر هنا المنشورات العامة المميزة بعد اختيارها. ويمكنك الانتقال للمجتمع لمشاهدة المحتوى المتاح لك.</p></div>
          <Link href="/community" className={styles.textLink}>تصفح المجتمع <ArrowLeft size={16} aria-hidden="true"/></Link>
        </div>}
      </section>

      <section className={styles.opportunities} aria-label="استكشف المزيد">
        <article><BriefcaseBusiness size={29} aria-hidden="true"/><h3>تعرف على المجموعة</h3><p>الرؤية والأنشطة والأعمال والأخبار الرسمية.</p><Link href="/company">عن ASLAN <ArrowUpLeft size={15} aria-hidden="true"/></Link></article>
        <article><Handshake size={29} aria-hidden="true"/><h3>نحو تعاون مستمر</h3><p>فرص الشراكة والتعاون المهني والتجاري.</p><Link href="/partners">بوابة الشركاء <ArrowUpLeft size={15} aria-hidden="true"/></Link></article>
        <article><ShieldCheck size={29} aria-hidden="true"/><h3>معلومات واضحة</h3><p>الأدوار وقواعد التعامل ودليل الاستخدام.</p><Link href="/guides">الأدلة والقواعد <ArrowUpLeft size={15} aria-hidden="true"/></Link></article>
      </section>

      <section className={styles.closing}>
        <span className={styles.eyebrow}>ASLAN MODELLING GROUP</span>
        <h2>نحوّل الحرفة إلى علامة، والتصميم إلى قيمة.</h2>
        <p>هل لديك مشروع أو فكرة أو طلب خدمة؟ ابدأ بالتواصل معنا من هنا.</p>
        <Link href="/contact" className={styles.goldButton}>تواصل مع ASLAN <ArrowLeft size={17} aria-hidden="true"/></Link>
      </section>
    </div>
  </main>;
}
