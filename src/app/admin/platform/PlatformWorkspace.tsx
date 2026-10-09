'use client';

import { useState } from 'react';

type Tab = 'search' | 'notifications' | 'knowledge' | 'analytics' | 'ai' | 'recommendations' | 'overview';
type ApiResult = Record<string, unknown>;

export default function PlatformWorkspace() {
  const [tab,setTab] = useState<Tab>('overview');
  const [query,setQuery] = useState('');
  const [article,setArticle] = useState({slug:'',title:'',excerpt:'',category:'general',body:'',status:'draft'});
  const [prompt,setPrompt] = useState('');
  const [output,setOutput] = useState<ApiResult|null>(null);
  const [error,setError] = useState('');
  const [busy,setBusy] = useState(false);
  async function call(path:string, method='GET', body?:unknown) {
    setBusy(true); setError(''); setOutput(null);
    try {
      const response=await fetch(path,{method,cache:'no-store',headers:body?{'content-type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined});
      const data=await response.json();
      setOutput(data);
      if(!response.ok) setError(typeof data.error==='string'?data.error:'تعذر تنفيذ العملية.');
    } catch { setError('تعذر الاتصال بالواجهة البرمجية.'); }
    finally { setBusy(false); }
  }
  const tabs: Array<[Tab,string]> = [
    ['overview','المؤشرات'],['search','البحث'],['notifications','الإشعارات'],['knowledge','قاعدة المعرفة'],
    ['analytics','التقارير'],['ai','الذكاء الاصطناعي'],['recommendations','التوصيات'],
  ];
  return <section className="card" style={{marginTop:24}}>
    <span className="kicker">LIVE OPERATIONS / M26–M32</span><h2>مساحة تشغيل الوحدات</h2>
    <div style={{display:'flex',gap:8,flexWrap:'wrap',margin:'16px 0'}}>
      {tabs.map(([id,label])=><button key={id} className={tab===id?'btn gold':'btn line'} type="button" onClick={()=>{setTab(id);setOutput(null);setError('');}}>{label}</button>)}
    </div>
    {tab==='overview'&&<div><p className="muted">قراءة المؤشرات الفعلية من الخادم. تظهر أخطاء القراءة صراحةً ولا تتحول إلى أصفار مضللة.</p><button className="btn gold" disabled={busy} onClick={()=>void call('/api/platform/admin')}>تحميل مركز التحكم</button></div>}
    {tab==='search'&&<form onSubmit={e=>{e.preventDefault();void call('/api/platform/search?q='+encodeURIComponent(query));}} style={{display:'grid',gap:12}}>
      <label>عبارة البحث<input value={query} onChange={e=>setQuery(e.target.value)} minLength={2} maxLength={120} required/></label><button className="btn gold" disabled={busy}>بحث</button>
    </form>}
    {tab==='notifications'&&<div style={{display:'flex',gap:10,flexWrap:'wrap'}}><button className="btn gold" disabled={busy} onClick={()=>void call('/api/platform/notifications')}>تحميل إشعارات الحساب</button><button className="btn line" disabled={busy} onClick={()=>void call('/api/platform/notifications','PATCH',{markAll:true})}>تعليم الكل كمقروء</button><p className="muted">إرسال إشعار لحساب آخر متاح عبر API للإدارة العليا فقط ويتطلب معرّف المستلم.</p></div>}
    {tab==='knowledge'&&<form onSubmit={e=>{e.preventDefault();void call('/api/platform/knowledge','POST',article);}} style={{display:'grid',gap:12}}>
      <label>الرابط المختصر<input value={article.slug} onChange={e=>setArticle({...article,slug:e.target.value})} required pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="guide-example"/></label>
      <label>العنوان<input value={article.title} onChange={e=>setArticle({...article,title:e.target.value})} minLength={3} maxLength={200} required/></label>
      <label>التصنيف<input value={article.category} onChange={e=>setArticle({...article,category:e.target.value})} maxLength={80} required/></label>
      <label>موجز<input value={article.excerpt} onChange={e=>setArticle({...article,excerpt:e.target.value})} maxLength={500}/></label>
      <label>المحتوى<textarea value={article.body} onChange={e=>setArticle({...article,body:e.target.value})} rows={6} maxLength={50000} required/></label>
      <label>الحالة<select value={article.status} onChange={e=>setArticle({...article,status:e.target.value})}><option value="draft">مسودة</option><option value="published">نشر</option></select></label>
      <div style={{display:'flex',gap:10,flexWrap:'wrap'}}><button className="btn gold" disabled={busy}>حفظ المقال</button><button className="btn line" type="button" disabled={busy} onClick={()=>void call('/api/platform/knowledge')}>قراءة المقالات</button></div>
    </form>}
    {tab==='analytics'&&<div style={{display:'flex',gap:10,flexWrap:'wrap'}}><button className="btn gold" disabled={busy} onClick={()=>void call('/api/platform/analytics?days=7')}>7 أيام</button><button className="btn line" disabled={busy} onClick={()=>void call('/api/platform/analytics?days=30')}>30 يومًا</button><button className="btn line" disabled={busy} onClick={()=>void call('/api/platform/analytics?days=90')}>90 يومًا</button></div>}
    {tab==='ai'&&<form onSubmit={e=>{e.preventDefault();void call('/api/platform/ai','POST',{feature:'assistant',input:prompt});}} style={{display:'grid',gap:12}}>
      <label>طلب المساعد<textarea value={prompt} onChange={e=>setPrompt(e.target.value)} rows={5} maxLength={12000} required/></label><button className="btn gold" disabled={busy}>تنفيذ عبر مزود الخادم</button><p className="muted">يتطلب إعداد ASLAN_AI_BASE_URL وASLAN_AI_API_KEY وASLAN_AI_MODEL على الخادم. لا يُرسل المفتاح إلى المتصفح.</p>
    </form>}
    {tab==='recommendations'&&<button className="btn gold" disabled={busy} onClick={()=>void call('/api/platform/recommendations')}>توليد توصيات قواعدية</button>}
    {busy&&<p role="status" className="muted">جارٍ تنفيذ الطلب…</p>}
    {error&&<p role="alert" className="card">{error}</p>}
    {output&&<pre className="card" style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',maxHeight:500,overflow:'auto',marginTop:16}}>{JSON.stringify(output,null,2)}</pre>}
  </section>;
}
