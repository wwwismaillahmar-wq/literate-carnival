'use client';

import { useState } from 'react';

export default function AddFriendButton({ userId }: { userId: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function add() {
    setBusy(true); setMessage('');
    try {
      const r = await fetch('/api/account/friendships', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({addresseeId:userId}) });
      const d = await r.json().catch(()=>({}));
      setMessage(r.ok ? 'تم إرسال طلب الصداقة.' : (d.error || 'تعذر إرسال طلب الصداقة.'));
    } catch { setMessage('تعذر الاتصال بالخادم.'); }
    finally { setBusy(false); }
  }
  return <div style={{display:'grid',gap:8,justifyItems:'start'}}><button className="btn primary" onClick={add} disabled={busy}>{busy?'جارٍ الإرسال...':'إضافة صديق'}</button>{message&&<span className="muted" role="status">{message}</span>}</div>;
}
