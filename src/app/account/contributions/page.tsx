import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ContributionForm from '@/components/ContributionForm';
import CommunityNav from '@/components/CommunityNav';

const labels:Record<string,string>={suggestion:'اقتراح',design:'تصميم',model:'نموذج',post:'مشاركة'};
const statuses:Record<string,string>={pending:'قيد المراجعة',needs_revision:'تحتاج تعديل',accepted:'مقبولة',published:'منشورة',rejected:'مرفوضة'};

export default async function ContributionsPage(){
  const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)redirect('/login?next=/account/contributions');
  const {data:profile}=await supabase.from('profiles').select('id,full_name,username,role,avatar_path').eq('id',user.id).maybeSingle();let avatar_url=null;if(profile?.avatar_path){const s=await supabase.storage.from('aslan-media').createSignedUrl(profile.avatar_path,3600);avatar_url=s.data?.signedUrl??null;}
  const {data:contributions}=await supabase.from('contributions').select('id,type,title,content,visibility,status,created_at,published_at,featured,featured_order').eq('user_id',user.id).order('created_at',{ascending:false});
  const items=[];
  for(const item of contributions??[]){const {data:media}=await supabase.from('media_assets').select('id,media_type,mime_type,object_path').eq('contribution_id',item.id).order('created_at',{ascending:true});const rendered=[];for(const m of media??[]){const s=await supabase.storage.from('aslan-media').createSignedUrl(m.object_path,3600);rendered.push({...m,signed_url:s.data?.signedUrl??null});}items.push({...item,media:rendered});}
  return <main className="section"><div className="wrap"><span className="kicker">ASLAN CONTRIBUTIONS</span><h1>مساهماتي</h1><p className="lead">المساهمات تستخدم نفس لغة المحتوى الاجتماعي: هوية، خصوصية، وسائط وFeatured.</p><CommunityNav/><ContributionForm/><div className="grid" style={{maxWidth:760,margin:'30px auto'}}>{items.length?items.map(item=><article className="social-post card" key={item.id}><header className="social-post__header"><div className="social-author">{avatar_url?<img src={avatar_url} alt="" className="social-avatar"/>:<div className="social-avatar social-avatar--fallback">AS</div>}<div><strong>{profile?.full_name||profile?.username||'عضو ASLAN'}</strong><div className="social-author__meta"><span>@{profile?.username||'member'}</span><span>· {labels[item.type]||item.type}</span><span>· {statuses[item.status]||item.status}</span><span>· {item.visibility}</span></div></div></div></header>{item.featured&&<div className="featured-badge">★ Featured</div>}<h2 className="social-post__title">{item.title}</h2><p className="social-post__body">{item.content}</p>{item.media?.length>0&&<div className="social-media">{item.media.map((m:any)=>m.signed_url&&(m.media_type==='video'?<video key={m.id} src={m.signed_url} controls className="social-media__item"/>:<img key={m.id} src={m.signed_url} alt="" className="social-media__item"/>))}</div>}<small className="muted">{new Date(item.created_at).toLocaleString('ar-DZ')}</small></article>):<div className="card"><p className="muted">لا توجد مساهمات بعد.</p></div>}</div><Link className="btn secondary" href="/account">← العودة إلى حسابي</Link></div></main>;
}
