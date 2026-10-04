import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function MemberProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const supabase = await createClient();
  const { data: profile } = await supabase.from('profiles').select('id, full_name, username, avatar_path, created_at').eq('username', username.toLowerCase()).maybeSingle();
  if (!profile) return <main className="section"><div className="wrap"><div className="card"><h1>الحساب غير موجود</h1><Link href="/members">العودة إلى الأعضاء</Link></div></div></main>;

  let avatar_url = null;
  if (profile.avatar_path) { const s = await supabase.storage.from('aslan-media').createSignedUrl(profile.avatar_path, 3600); avatar_url = s.data?.signedUrl ?? null; }
  const { data: posts } = await supabase.from('posts').select('id,title,content,published_at').eq('author_id', profile.id).eq('visibility','public').eq('status','published').order('published_at',{ascending:false}).limit(12);

  return <main className="section" style={{minHeight:'70vh'}}><div className="wrap">
    <span className="kicker">ASLAN MEMBER</span>
    <div className="card" style={{display:'grid',gap:12}}>
      {avatar_url ? <img src={avatar_url} alt="" style={{width:120,height:120,borderRadius:'50%',objectFit:'cover'}}/> : <div style={{width:120,height:120,borderRadius:'50%',display:'grid',placeItems:'center',background:'var(--surface-2,#eee)',fontSize:48}}>👤</div>}
      <h1>{profile.full_name || profile.username}</h1>
      {profile.username && <p className="muted">@{profile.username}</p>}
      <Link className="btn secondary" href="/account/friends">إضافة صديق من دليل الأعضاء</Link>
    </div>
    <section style={{marginTop:28}}><span className="kicker">PUBLIC POSTS</span><h2>المنشورات العامة</h2>
      {posts?.length ? <div className="grid three" style={{marginTop:18}}>{posts.map(post => <article className="card" key={post.id}><h3>{post.title}</h3><p>{post.content}</p></article>)}</div> : <div className="card" style={{marginTop:18}}><p className="muted">لا توجد منشورات عامة لهذا العضو.</p></div>}
    </section>
    <div style={{marginTop:24}}><Link className="btn secondary" href="/members">← جميع الأعضاء</Link></div>
  </div></main>;
}
