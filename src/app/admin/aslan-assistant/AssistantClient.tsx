'use client';
import { useState } from 'react';
import Link from 'next/link';

type Result = { ok?: boolean; authenticated?: boolean; authorized?: boolean; integrations?: { gemini: string; notion: string }; error?: string };
export default function AssistantClient() {
  const [busy,setBusy]=useState(false);
  const [status,setStatus]=useState<Result|null>(null);
  async function check() {
    setBusy(true);
    try {
      const response=await fetch('/api/admin/aslan-assistant',{cache:'no-store'});
      const body=await response.json() as Result;
      setStatus(response.ok?body:{error:body.error||'تعذر التحقق من الاتصال'});
    } catch {setStatus({error:'تعذر الاتصال بالخادم'});}
    finally {setBusy(false);}
  }
  return <main className="section" dir="rtl"><div className="wrap" style={{maxWidth:850}}>
    <p className="kicker">ASLAN MODELLING GROUP / ADMIN</p>
    <h1>مساعد ASLAN الإداري</h1>
    <p className="muted">واجهة الإدارة المؤمنة. لا تُرسل أي أوامر إلى Gemini أو Notion قبل اكتمال الربط المصرح به.</p>
    <section className="card" style={{display:'grid',gap:16,marginTop:24}}>
      <h2>حالة الاتصال</h2>
      <button className="btn primary" type="button" disabled={busy} onClick={check}>{busy?'جارٍ التحقق...':'تحقق من جاهزية المساعد'}</button>
      {status?.error&&<p role="alert">{status.error}</p>}
      {status?.integrations&&<div aria-live="polite">
        <p>Gemini: {status.integrations.gemini==='connected'?'متصل':'لم يتم التحقق من الاتصال'}</p>
        <p>Notion: {status.integrations.notion==='connected'?'متصل':'لم يتم التحقق من الاتصال'}</p>
      </div>}
      <p className="muted">المحادثة والكتابة في الأرشيف غير مفعّلتين حتى يتوفر تفويض خادمي آمن ويتم اختبار الاتصال الفعلي. لا يُطلب منك إدخال مفاتيح هنا.</p>
    </section>
    <p style={{marginTop:20}}><Link href="/admin/dashboard">العودة إلى لوحة الإدارة</Link></p>
  </div></main>;
}
