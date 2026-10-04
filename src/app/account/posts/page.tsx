import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import PostForm from '@/components/PostForm';
import SocialPost, { type SocialPostData } from '@/components/SocialPost';
import CommunityNav from '@/components/CommunityNav';

export default async function PostsPage(){
  const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)redirect('/login?next=/account/posts');
  const {data:posts}=await supabase.from('posts').select('id,author_id,title,content,visibility,status,created_at,published_at,featured,featured_order').eq('author_id',user.id).order('created_at',{ascending:false});
  const rendered=[];
  for(const post of posts??[]){const {data:profile}=await supabase.from('profiles').select('id,full_name,username,role,avatar_path').eq('id',user.id).maybeSingle();let avatar_url=null;if(profile?.avatar_path){const s=await supabase.storage.from('aslan-media').createSignedUrl(profile.avatar_path,3600);avatar_url=s.data?.signedUrl??null;}const {data:media}=await supabase.from('media_assets').select('id,media_type,mime_type,object_path').eq('post_id',post.id).order('created_at',{ascending:true});const items=[];for(const m of media??[]){const s=await supabase.storage.from('aslan-media').createSignedUrl(m.object_path,3600);items.push({...m,signed_url:s.data?.signedUrl??null});}rendered.push({...post,author:profile,avatar_url,media:items,viewerIsOwner:true,viewerAuthenticated:true});}
  return <main className="section"><div className="wrap"><span className="kicker">ASLAN POSTS</span><h1>منشوراتي</h1><p className="lead">أنشئ، عدّل، أرفق الوسائط، أو احذف منشوراتك فعليًا.</p><CommunityNav/><PostForm/><div style={{marginTop:30}}>{rendered.length?<div className="grid" style={{maxWidth:760,margin:'0 auto'}}>{rendered.map(post=><SocialPost key={post.id} post={post as SocialPostData}/>)}</div>:<div className="card"><h2>لا توجد منشورات بعد.</h2><p className="muted">أنشئ أول منشور من النموذج أعلاه.</p></div>}</div><div style={{marginTop:24}}><Link className="btn secondary" href="/account">← العودة إلى حسابي</Link></div></div></main>;
}
