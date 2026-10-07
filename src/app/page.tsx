import Link from 'next/link';
import { site } from '@/lib/config';
import { getHomepageProducts } from '@/lib/data';
import { createClient } from '@/lib/supabase/server';
import SocialPost, { type SocialPostData } from '@/components/SocialPost';
import { HomeProductCarousel } from '@/components/HomeProductCarousel';

export default async function HomePage(){
  const products=await getHomepageProducts();
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
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
    const {data:media}=await supabase.from('media_assets').select('id,media_type,mime_type,object_path').eq(mediaColumn,item.id).order('created_at',{ascending:true}).limit(8);
    const rendered=[]; for(const mediaItem of media??[]){const s=await supabase.storage.from('aslan-media').createSignedUrl(mediaItem.object_path,3600); rendered.push({...mediaItem,signed_url:s.data?.signedUrl??null});}
    return {...item,author,avatar_url,media:rendered,viewerIsOwner:false,viewerAuthenticated:!!user};
  }

  const posts=[
    ...await Promise.all((featuredPosts??[]).map(post=>enrichContent({...post,author_id:post.author_id},'post_id'))),
    ...await Promise.all((featuredContributions??[]).map(item=>enrichContent({...item,author_id:item.user_id},'contribution_id'))),
  ];  return <main>
    <section className="section"><div className="wrap"><span className="kicker">{site.name}</span><h1 className="display">نبني الجودة. <span className="gold">نصنع الثقة.</span></h1><p className="lead">تنجيد • خياطة • تفصيل — منتجات مخصصة، خدمات تنفيذية، وتكوين مهني ضمن منظومة ASLAN.</p><div className="actions"><Link className="button primary" href="/products">استكشف المنتجات</Link><Link className="button secondary" href="/services">اطلب خدمة</Link></div></div></section>

    <section className="section">
      <div className="wrap">
        <HomeProductCarousel products={products}/>
      </div>
    </section>

    <section className="section"><div className="wrap"><div className="section-heading row"><div><span className="kicker">ASLAN FEATURED FEED</span><h2>المحتوى المميز</h2><p>هذه الصفحة لا تجمع كل منشورات المجتمع؛ هنا يظهر فقط المحتوى الذي تم تمييزه.</p></div><Link href="/community">المجتمع ↗</Link></div>{posts.length?<div className="grid" style={{maxWidth:760,margin:'0 auto'}}>{posts.map(post=><SocialPost key={post.id} post={post as SocialPostData}/>)}</div>:<div className="card"><h3>لا يوجد محتوى مميز حاليًا.</h3><p className="muted">سيظهر هنا المحتوى المنشور الذي تختاره الإدارة لاحقًا كـ Featured.</p><Link href="/community">انتقل إلى المجتمع ↗</Link></div>}</div></section>

    <section className="section"><div className="wrap"><div className="grid three"><article className="card"><span className="number">01</span><h3>تنجيد • خياطة • تفصيل</h3><p>منتجات ومنفذات مخصصة تجمع بين الحرفة والتصميم وجودة التنفيذ.</p><Link href="/products">استكشف المنتجات ↗</Link></article><article className="card"><span className="number">02</span><h3>الخدمات التنفيذية</h3><p>خدمات تقنية وتنفيذية مرتبطة بخبرة ASLAN.</p><Link href="/services">استكشف الخدمات ↗</Link></article><article className="card"><span className="number">03</span><h3>الأكاديمية</h3><p>تكوين مهني وتقني قابل للتطبيق والتوسع.</p><Link href="/academy">استكشف الأكاديمية ↗</Link></article></div></div></section>
    <section className="section dark"><div className="wrap"><div className="grid three"><article><span className="kicker">SERVICES</span><h2>خدمات تنفيذية</h2><p>حلول عملية مبنية على الخبرة الفنية والتنفيذ الميداني.</p><Link href="/services">اطلب خدمة ↗</Link></article><article><span className="kicker">ACADEMY</span><h2>تكوين مهني</h2><p>تحويل الخبرة والحرفة إلى برامج تكوين قابلة للتطبيق.</p><Link href="/academy">تعرف على الأكاديمية ↗</Link></article><article><span className="kicker">PARTNERS</span><h2>الشركاء</h2><p>منظومة علاقات وشراكات قابلة للنمو.</p><Link href="/partners">استكشف الشراكات ↗</Link></article></div></div></section>
    <section className="section"><div className="wrap"><div className="cta"><span className="kicker">ASLAN MODELLING GROUP</span><h2>لنبنِ العمل معًا.</h2><p>للاستفسارات، طلب خدمة، أو التواصل مع ASLAN.</p><Link className="button primary" href="/contact">تواصل معنا</Link></div></div></section>
  </main>;
}
