'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Product = { id: number; name: string; slug: string; description: string; price_dzd: number | null; score: number; reason: string; algorithm: string };
export default function RecommendationsPage() {
  const [items,setItems] = useState<Product[]>([]);
  const [error,setError] = useState('');
  useEffect(()=>{ void (async()=>{ try { const r=await fetch('/api/platform/recommendations',{cache:'no-store'}); const d=await r.json(); if(!r.ok) throw new Error(d.error??'تعذر تحميل التوصيات.'); setItems(d.recommendations??[]); } catch(e){setError(e instanceof Error?e.message:'تعذر تحميل التوصيات.');} })(); },[]);
  return <main className="section"><div className="wrap">
    <span className="kicker">M31 / RECOMMENDATIONS</span><h1>مقترحات ASLAN</h1>
    <p className="muted">تعتمد النسخة الحالية على قواعد واضحة للمنتجات النشطة، ولا تدّعي تخصيصًا بالذكاء الاصطناعي.</p>
    {error&&<p className="card" role="alert">{error}</p>}
    {!items.length&&!error&&<p className="card muted">لا توجد منتجات نشطة لعرضها حاليًا.</p>}
    <div className="grid three" style={{marginTop:20}}>{items.map(p=><article className="card" key={p.id}>
      <span className="kicker">{p.algorithm}</span><h2>{p.name}</h2><p className="muted">{p.description}</p><p>{p.price_dzd==null?'السعر عند الطلب':new Intl.NumberFormat('ar-DZ').format(p.price_dzd)+' دج'}</p><small className="muted">{p.reason}</small><p><Link href={'/products/'+encodeURIComponent(p.slug)}>عرض المنتج ←</Link></p>
    </article>)}</div>
  </div></main>;
}
