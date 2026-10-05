import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ContributionForm from '@/components/ContributionForm';
import CommunityNav from '@/components/CommunityNav';
import ContributionCard from '@/components/ContributionCard';

export default async function ContributionsPage(){
  const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)redirect('/login?next=/account/contributions');
  const {data:profile}=await supabase.from('profiles').select('id,full_name,username,role,avatar_path').eq('id',user.id).maybeSingle();let avatar_url=null;if(profile?.avatar_path){const s=await supabase.storage.from('aslan-media').createSignedUrl(profile.avatar_path,3600);avatar_url=s.data?.signedUrl??null;}
  const {data:contributions}=await supabase.from('contributions').select('id,type,title,content,visibility,status,created_at,published_at,featured,featured_order').eq('user_id',user.id).order('created_at',{ascending:false});
  const items=[];
  for(const item of contributions??[]){const {data:media}=await supabase.from('media_assets').select('id,media_type,mime_type,object_path').eq('contribution_id',item.id).order('created_at',{ascending:true});const rendered=[];for(const m of media??[]){const s=await supabase.storage.from('aslan-media').createSignedUrl(m.object_path,3600);rendered.push({...m,signed_url:s.data?.signedUrl??null});}items.push({...item,media:rendered});}
  return <main className="section"><div className="wrap"><span className="kicker">ASLAN CONTRIBUTIONS</span><h1>مساهماتي</h1><p className="lead">المساهمات تستخدم نفس لغة المحتوى الاجتماعي: هوية، خصوصية، وسائط وFeatured.</p><CommunityNav/><ContributionForm/><div className="grid" style={{maxWidth:760,margin:'30px auto'}}>{items.length?items.map(item=><ContributionCard key={item.id} item={{...item,avatar_url,authorName:profile?.full_name,username:profile?.username}}/>):<div className="card"><p className="muted">لا توجد مساهمات بعد.</p></div>}</div><Link className="btn secondary" href="/account">← العودة إلى حسابي</Link></div></main>;

}
