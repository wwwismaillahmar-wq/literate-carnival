'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type Friendship = { id:string; requester_id:string; addressee_id:string; status:string; created_at:string; };

export default function FriendsPage() {
  const [items, setItems] = useState<Friendship[]>([]);
  const [userId, setUserId] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    const r = await fetch('/api/account/friendships');
    const d = await r.json().catch(() => ({}));
    if (r.ok) setItems(d.friendships || []);
    else setMessage(d.error || 'تعذر تحميل الأصدقاء.');
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function addFriend(e: React.FormEvent) {
    e.preventDefault();
    setMessage('');
    const r = await fetch('/api/account/friendships', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({addresseeId:userId}) });
    const d = await r.json().catch(() => ({}));
    setMessage(r.ok ? 'تم إرسال طلب الصداقة.' : (d.error || 'تعذر إرسال الطلب.'));
    if (r.ok) { setUserId(''); load(); }
  }

  async function update(id:string,status:string) {
    const r=await fetch('/api/account/friendships',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({friendshipId:id,status})});
    const d=await r.json().catch(()=>({}));
    setMessage(r.ok ? 'تم تحديث العلاقة.' : (d.error || 'تعذر التحديث.'));
    load();
  }

  return <main className="section" style={{minHeight:'70vh'}}><div className="wrap">
    <span className="kicker">ASLAN FRIENDS</span><h1>أصدقائي</h1>
    <p className="muted">الصديق المقبول يمكنه رؤية المحتوى الذي اخترت له مستوى «الأصدقاء» وبدء محادثة مباشرة.</p>
    <form className="card" onSubmit={addFriend} style={{display:'grid',gap:14,marginTop:28}}>
      <h2>إضافة صديق</h2>
      <label>معرّف حساب الصديق<input value={userId} onChange={e=>setUserId(e.target.value)} placeholder="UUID الحساب" required /></label>
      <button className="btn primary" type="submit">إرسال طلب الصداقة</button>
    </form>
    <div className="card" style={{marginTop:24}}><h2>العلاقات</h2>
      {loading ? <p className="muted">جارٍ التحميل...</p> : items.length ? <div className="grid" style={{gap:12}}>{items.map(item=><article className="card" key={item.id}><p><strong>الحالة:</strong> {item.status}</p><p className="muted">{item.requester_id} ↔ {item.addressee_id}</p>{item.status==='pending' && <div style={{display:'flex',gap:8,flexWrap:'wrap'}}><button className="btn secondary" onClick={()=>update(item.id,'accepted')}>قبول</button><button className="btn secondary" onClick={()=>update(item.id,'rejected')}>رفض</button><button className="btn secondary" onClick={()=>update(item.id,'cancelled')}>إلغاء</button></div>}{item.status==='accepted' && <button className="btn secondary" onClick={()=>update(item.id,'blocked')}>حظر</button>}</article>)}</div> : <p className="muted">لا توجد علاقات بعد.</p>}
    </div>
    {message && <p className="muted" role="status">{message}</p>}
    <div style={{marginTop:24}}><Link className="btn secondary" href="/account">← العودة إلى حسابي</Link></div>
  </div></main>;
}
