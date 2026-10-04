import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import SocialPost from '@/components/SocialPost';
import CommunityNav from '@/components/CommunityNav';

type Post={id:string;author_id:string;title:string;content:string;visibility:string;status:string;created_at:string;published_at:string|null;featured:boolean;featured_order:number};

export default async function CommunityPage(){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  const {data:posts}=await supabase.from('posts').select('id,author_id,title,content,visibility,status,created_at,published_at,featured,featured_order').eq('status','published').order('created_at',{ascending:false}).limit(30);
  const authorIds=[...new Set((posts??[]).map(p=>p.author_id))];
  const {data:authors}=authorIds.length?await supabase.from('profiles').select('id,full_name,username,role,avatar_path').in('id',authorIds):{data:[]};
  const authorMap=new Map((authors??[]).map(a=>[a.id,a]));
  const result=[];
  for(const post of (posts??[]) as Post[]){
    const author=authorMap.get(post.author_id);
    let avatar_url=null;
    if(author?.avatar_path){const s=await supabase.storage.from('aslan-media').createSignedUrl(author.avatar_path,3600);avatar_url=s.data?.signedUrl??null;}
    const {data:media}=await supabase.from('media_assets').select('id,media_type,mime_type,object_path').eq('post_id',post.id).order('created_at',{ascending:true}).limit(8);
    const rendered=[];
    for(const item of media??[]){const s=await supabase.storage.from('aslan-media').createSignedUrl(item.object_path,3600);rendered.push({...item,signed_url:s.data?.signedUrl??null});}
    result.push({...post,author,avatar_url,media:rendered,viewerIsOwner:user?.id===post.author_id});
  }
  return <main className="section"><div className="wrap"><span className="kicker">ASLAN COMMUNITY</span><h1>المجتمع</h1><p className="lead">مساحة اجتماعية موحدة للمحتوى المنشور الذي يسمح لك نظام الخصوصية برؤيته.</p><CommunityNav/>{result.length?<div className="grid" style={{maxWidth:760,margin:'0 auto'}}>{result.map(post=><SocialPost key={post.id} post={post as any}/>)}</div>:<div className="card"><h2>لا توجد منشورات متاحة بعد.</h2><p className="muted">ابدأ بمنشور عام، أو أضف أصدقاء لرؤية محتوى الأصدقاء.</p>{user?<Link className="btn primary" href="/account/posts">إنشاء منشور</Link>:<Link className="btn primary" href="/login?next=/community">تسجيل الدخول</Link>}</div>}</div></main>;
}
