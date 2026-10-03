import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function FriendRequestsPage() {
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) redirect('/login?next=/account/friend-requests');
  const {data:incoming}=await supabase.from('friendships').select('id,requester_id,status,created_at').eq('addressee_id',user.id).eq('status','pending').order('created_at',{ascending:false});
  return <main className="section" style={{minHeight:'70vh'}}><div className="wrap">
    <span className="kicker">ASLAN FRIEND REQUESTS</span><h1>طلبات الصداقة</h1>
    <p className="muted">الطلبات الواردة إلى حسابك.</p>
    <div className="card" style={{marginTop:28}}>{incoming?.length ? <div className="grid" style={{gap:12}}>{incoming.map(item=><article className="card" key={item.id}><p>من الحساب: <strong>{item.requester_id}</strong></p><RequestActions id={item.id}/></article>)}</div> : <p className="muted">لا توجد طلبات جديدة.</p>}</div>
    <div style={{marginTop:24}}><Link className="btn secondary" href="/account">← العودة إلى حسابي</Link></div>
  </div></main>;
}

async function RequestActions({id}:{id:string}) {
  return <form action={async()=>{}}></form>;
}
