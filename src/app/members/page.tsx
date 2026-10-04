import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function MembersPage() {
  const supabase = await createClient();
  const { data: members } = await supabase.from('profiles').select('id, full_name, username, avatar_path').order('created_at', { ascending: false }).limit(60);
  const cards = [];
  for (const member of members ?? []) {
    let avatar_url = null;
    if (member.avatar_path) {
      const s = await supabase.storage.from('aslan-media').createSignedUrl(member.avatar_path, 3600);
      avatar_url = s.data?.signedUrl ?? null;
    }
    cards.push({ ...member, avatar_url });
  }
  return <main className="section" style={{minHeight:'70vh'}}><div className="wrap">
    <span className="kicker">ASLAN COMMUNITY</span><h1>أعضاء المجتمع</h1>
    <p className="muted">هنا تظهر حسابات مجتمع ASLAN. افتح أي ملف للتعرف على صاحبه.</p>
    <div className="grid three" style={{marginTop:28}}>
      {cards.map(member => <article className="card" key={member.id} style={{display:'grid',gap:10}}>
        {member.avatar_url ? <img src={member.avatar_url} alt="" style={{width:88,height:88,borderRadius:'50%',objectFit:'cover'}}/> : <div style={{width:88,height:88,borderRadius:'50%',display:'grid',placeItems:'center',background:'var(--surface-2,#eee)',fontSize:34}}>👤</div>}
        <h3>{member.full_name || member.username || 'عضو ASLAN'}</h3>
        {member.username && <span className="muted">@{member.username}</span>}
        {member.username ? <Link className="btn secondary" href={`/members/${encodeURIComponent(member.username)}`}>عرض الملف</Link> : <span className="muted">أكمل اسم المستخدم لفتح الملف العام.</span>}
      </article>)}
    </div>
    {!cards.length && <div className="card" style={{marginTop:28}}><h3>لا يوجد أعضاء للعرض بعد.</h3></div>}
  </div></main>;
}
