import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import MemberActions from '@/components/MemberActions';
import CommunityNav from '@/components/CommunityNav';
import SocialPost, { type SocialPostData } from '@/components/SocialPost';

export default async function MemberProfilePage({params}:{params:Promise<{username:string}>}){
  const {username}=await params; const supabase=await createClient();
  const {data:profile}=await supabase.from('profiles').select('id,full_name,username,avatar_path,role,created_at').eq('username',username.toLowerCase()).maybeSingle();
  if(!profile)return <main className="section"><div className="wrap"><div className="card"><h1>الحساب غير موجود</h1><Link href="/members">العودة إلى الأعضاء</Link></div></div></main>;
  const {data:{user}}=await supabase.auth.getUser();
  let avatar_url=null;if(profile.avatar_path){const s=await supabase.storage.from('aslan-media').createSignedUrl(profile.avatar_path,3600);avatar_url=s.data?.signedUrl??null;}
  let relation:null|{id:string;requester_id:string;addressee_id:string;status:string}=null;
  if(user&&user.id!==profile.id){const {data}=await supabase.from('friendships').select('id,requester_id,addressee_id,status').or(`and(requester_id.eq.${user.id},addressee_id.eq.${profile.id}),and(requester_id.eq.${profile.id},addressee_id.eq.${user.id})`).limit(1).maybeSingle();relation=data;}
  const {data:posts}=await supabase.from('posts').select('id,author_id,title,content,visibility,status,created_at,published_at,featured,featured_order').eq('author_id',profile.id).eq('visibility','public').eq('status','published').order('published_at',{ascending:false}).limit(12);
  const rendered=[];
  for(const post of posts??[]){const {data:media}=await supabase.from('media_assets').select('id,media_type,mime_type,object_path').eq('post_id',post.id).order('created_at',{ascending:true}).limit(8);const items=[];for(const m of media??[]){const s=await supabase.storage.from('aslan-media').createSignedUrl(m.object_path,3600);items.push({...m,signed_url:s.data?.signedUrl??null});}rendered.push({...post,author:profile,avatar_url,media:items,viewerIsOwner:user?.id===profile.id,viewerAuthenticated:!!user});}
  return <main className="section"><div className="wrap"><CommunityNav/><div className="card" style={{display:'grid',gap:12}}><div className="social-author">{avatar_url?<img src={avatar_url} alt="" className="social-avatar" style={{width:72,height:72}}/>:<div className="social-avatar social-avatar--fallback" style={{width:72,height:72}}>AS</div>}<div><span className="kicker">ASLAN MEMBER</span><h1 style={{margin:'4px 0'}}>{profile.full_name||profile.username}</h1>{profile.username&&<div className="muted">@{profile.username}</div>}{profile.role&&<div className="muted">{profile.role}</div>}</div></div><div style={{display:'flex',gap:8,flexWrap:'wrap'}}>{!user?<Link className="btn primary" href={`/login?next=/members/${encodeURIComponent(profile.username||username)}`}>تسجيل الدخول للتواصل</Link>:user.id===profile.id?<Link className="btn secondary" href="/account/profile">تعديل ملفي</Link>:<MemberActions member={{id:profile.id,full_name:profile.full_name,username:profile.username,avatar_url}} showProfile={false}/>}</div></div><section style={{marginTop:28}}><span className="kicker">PUBLIC CONTENT</span><h2>منشورات {profile.full_name||profile.username}</h2>{rendered.length?<div className="grid" style={{maxWidth:760,margin:'18px auto'}}>{rendered.map(post=><SocialPost key={post.id} post={post as SocialPostData}/>)}</div>:<div className="card"><p className="muted">لا توجد منشورات عامة منشورة لهذا العضو.</p></div>}</section><div style={{marginTop:24}}><Link className="btn secondary" href="/members">← جميع الأعضاء</Link></div></div></main>;
}
