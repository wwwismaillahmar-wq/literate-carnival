'use client';

import Link from 'next/link';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import MediaUploader from '@/components/MediaUploader';
import MemberActions from '@/components/MemberActions';

export type SocialMedia={id:string;media_type:'image'|'video'|'file';signed_url:string|null;mime_type?:string|null;object_path?:string};
export type SocialPostData={
  id:string;author_id:string;title:string;content:string;visibility:string;status:string;created_at:string;published_at?:string|null;featured?:boolean;featured_order?:number;
  author?:{id:string;full_name:string|null;username:string|null;role?:string|null}|null;avatar_url?:string|null;media?:SocialMedia[];viewerIsOwner?:boolean;viewerAuthenticated?:boolean;
};

const visibilityLabels:Record<string,string>={public:'عام',friends:'الأصدقاء',private:'خاص'};

export default function SocialPost({post,onDeleted}:{post:SocialPostData;onDeleted?:()=>void}){
 const router=useRouter();const [menu,setMenu]=useState(false);const [editing,setEditing]=useState(false);const [title,setTitle]=useState(post.title);const [body,setBody]=useState(post.content);const [visibility,setVisibility]=useState(post.visibility);const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 async function remove(){if(!confirm('حذف هذا المنشور نهائيًا؟'))return;setBusy(true);setError('');const r=await fetch('/api/account/posts?postId='+encodeURIComponent(post.id),{method:'DELETE'});const d=await r.json().catch(()=>({}));if(!r.ok){setError(d.error||'تعذر حذف المنشور.');setBusy(false);return;}onDeleted?.();router.refresh();}
 async function save(){setBusy(true);setError('');const r=await fetch('/api/account/posts',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({postId:post.id,title,content:body,visibility})});const d=await r.json().catch(()=>({}));if(!r.ok){setError(d.error||'تعذر تعديل المنشور.');setBusy(false);return;}setEditing(false);setBusy(false);router.refresh();}
 const author=post.author;
 return <article className='social-post card'>
  <header className='social-post__header'>
   <div className='social-author'>
    <Link href={'/members/'+encodeURIComponent(author?.username||author?.id||'')} className='social-author__identity'>{post.avatar_url?<img src={post.avatar_url} alt='' className='social-avatar'/>:<div className='social-avatar social-avatar--fallback'>AS</div>}<div><div className='social-author__name'>{author?.full_name||author?.username||'عضو ASLAN'}</div><div className='social-author__meta'>{author?.username&&<span>@{author.username}</span>}{author?.role&&<span>· {author.role}</span>}<span>· {new Date(post.created_at).toLocaleString('ar-DZ',{dateStyle:'medium',timeStyle:'short'})}</span><span>· {visibilityLabels[post.visibility]||post.visibility}</span></div></div></Link>
    {post.viewerAuthenticated&&!post.viewerIsOwner&&author&&<MemberActions member={{id:author.id,full_name:author.full_name,username:author.username,avatar_url:post.avatar_url}} showProfile={false}/>}
   </div>
   {post.viewerIsOwner&&<div className='social-post__menu'><button className='icon-button' aria-label='خيارات المنشور' onClick={()=>setMenu(v=>!v)}>⋮</button>{menu&&<div className='post-menu'><button onClick={()=>{setEditing(true);setMenu(false)}}>تعديل</button><button onClick={remove} disabled={busy}>حذف</button></div>}</div>}
  </header>
  {post.featured&&<div className='featured-badge'>★ Featured</div>}
  {editing?<div className='social-edit'><input value={title} onChange={e=>setTitle(e.target.value)} maxLength={160}/><textarea value={body} onChange={e=>setBody(e.target.value)} maxLength={10000} rows={6}/><select value={visibility} onChange={e=>setVisibility(e.target.value)}><option value='public'>عام</option><option value='friends'>الأصدقاء</option><option value='private'>خاص</option></select><MediaUploader postId={post.id}/><div className='actions'><button className='btn primary' onClick={save} disabled={busy}>حفظ</button><button className='btn secondary' onClick={()=>setEditing(false)}>إلغاء</button></div></div>:<><h2 className='social-post__title'>{post.title}</h2>{post.content&&<p className='social-post__body'>{post.content}</p>}</>}
  {!!post.media?.length&&<div className='social-media'>{post.media.map(item=>item.signed_url&&(item.media_type==='video'?<video key={item.id} src={item.signed_url} controls preload='metadata' className='social-media__item'/>:item.media_type==='image'?<img key={item.id} src={item.signed_url} alt='' className='social-media__item'/>:<a key={item.id} className='social-file' href={item.signed_url} target='_blank' rel='noreferrer'>📎 {item.object_path?.split('/').pop()||'فتح المستند'}</a>))}</div>}
  {error&&<p className='error-text' role='alert'>{error}</p>}
 </article>;
}