import Link from 'next/link';
import { ArrowLeft, ArrowUpLeft, BookOpen, BriefcaseBusiness, GraduationCap, Handshake, PackageCheck, ShieldCheck, ShoppingBag, UsersRound, Wrench } from 'lucide-react';
import styles from './HomeExperience.module.css';
import { site } from '@/lib/config';
import { getHomepageProducts } from '@/lib/data';
import { createClient } from '@/lib/supabase/server';
import SocialPost, { type SocialPostData } from '@/components/SocialPost';
import { HomeAcademySection } from '@/components/academy/HomeAcademySection';
import { HomeProductCarousel } from '@/components/HomeProductCarousel';

export default async function HomePage(){
  const products=await getHomepageProducts();
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  const {data: settingRows}=await supabase.from('site_settings').select('setting_key,setting_value').eq('is_public',true);
  const siteSettings=new Map((settingRows??[]).map(row=>[row.setting_key,row.setting_value]));
  const homeEyebrow=siteSettings.get('home_eyebrow')||site.name;
  const homeTitlePrimary=siteSettings.get('home_title_primary')||'نبني الجودة.';
  const homeTitleAccent=siteSettings.get('home_title_accent')||'نصنع الثقة.';
  const homeSubtitle=siteSettings.get('home_subtitle')||'تنجيد • خياطة • تفصيل — منتجات مخصصة، خدمات تنفيذية، وتكوين مهني ضمن منظومة ASLAN.';
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
    {href:'/market',title:'السوق والمنتجات',description:'كتالوج المنتجات والمتاجر والتفصيل حسب الطلب.',icon:ShoppingBag,label:'التسوق والأعمال'},
    {href:'/services',title:'الخدمات',description:'اطلب خدمات مهنية وتابع عروض الأسعار والتنفيذ.',icon:Wrench,label:'الحلول الميدانية'},
    {href:'/academy',title:'الأكاديمية',description:'استكشف الدورات والمسارات التقنية والتكوين المهني.',icon:GraduationCap,label:'التعلم والتكوين'},
    {href:'/community',title:'المجتمع',description:'تواصل مع الأعضاء وتبادل الخبرات والمشاريع.',icon:UsersRound,label:'التواصل والتعاون'},
    {href:'/partners',title:'الشراكات',description:'تعرّف على فرص التعاون وقدم طلب شراكة.',icon:Handshake,label:'النمو المشترك'},
  ];

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
        <aside className={styles.heroAside}>
          <span className={styles.sideEyebrow}>ASLAN MODELLING GROUP</span>
          <h2>كل ما تحتاجه، في فضائه المناسب.</h2>
          <p>اختر مسارك مباشرة. لكل قطاع أدواته، وتجمعها منظومة ASLAN بهوية واحدة.</p>
          <nav className={styles.quickRoutes} aria-label="مسارات سريعة">
            <Link href="/market"><ShoppingBag size={18}/> منتجات ومتاجر <ArrowUpLeft size={17}/></Link>
            <Link href="/services"><Wrench size={18}/> خدمات ومشاريع <ArrowUpLeft size={17}/></Link>
            <Link href="/academy"><GraduationCap size={18}/> مهارات ودورات <ArrowUpLeft size={17}/></Link>
            <Link href="/community"><UsersRound size={18}/> مجتمع مهني <ArrowUpLeft size={17}/></Link>
          </nav>
        </aside>
      </section>

      <section className={styles.section} aria-labelledby="portals-heading">
        <div className={styles.sectionHeading}>
          <div><span className={styles.eyebrow}>اكتشف المجموعة</span><h2 id="portals-heading">إلى أين تريد الذهاب؟</h2><p>بوابات مستقلة بحسب ما تريد إنجازه.</p></div>
        </div>
        <div className={styles.portalGrid}>
          {portals.map(item=>{const Icon=item.icon;return <Link href={item.href} className={styles.portalCard} key={item.href}>
            <span className={styles.portalIcon}><Icon size={26} aria-hidden="true"/></span>
            <span className={styles.portalLabel}>{item.label}</span>
            <strong>{item.title}</strong>
            <p>{item.description}</p>
            <span className={styles.portalVisit}>ادخل الفضاء <ArrowUpLeft size={16} aria-hidden="true"/></span>
          </Link>;})}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="products-heading">
        <div className={styles.sectionHeading}>
          <div><span className={styles.eyebrow}>ASLAN MARKET</span><h2 id="products-heading">اكتشف سوق المنتجات</h2><p>منتجات ASLAN والمتاجر المعتمدة، منفصلة عن خدمات التنفيذ.</p></div>
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
          <div><span className={styles.eyebrow}>ASLAN SERVICES</span><h2 id="services-heading">خدمات مهنية تلائم احتياجك</h2><p>من طلب الخدمة إلى عرض السعر والمتابعة، ضمن فضاء مستقل.</p></div>
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
          <div><span className={styles.eyebrow}>ASLAN COMMUNITY</span><h2 id="community-heading">من المجتمع المهني</h2><p>مختارات من المنشورات التي أجازت الإدارة إبرازها علنًا.</p></div>
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
