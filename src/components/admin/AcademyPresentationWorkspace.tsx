'use client';
import { useEffect,useState } from 'react';
import { readPresentation,trainingFields,type CoursePresentation } from '@/lib/academy/catalog';
type Course={id:string;title?:string;name?:string;status?:string};
export function AcademyPresentationWorkspace() {
 const [courses,setCourses]=useState<Course[]>([]);const [items,setItems]=useState<Record<string,CoursePresentation>>({});
 const [selected,setSelected]=useState('');const [loading,setLoading]=useState(true);const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [notice,setNotice]=useState('');
 useEffect(()=>{let active=true;void(async()=>{try{
  const responses=await Promise.all([fetch('/api/academy/courses',{cache:'no-store'}),fetch('/api/platform/site-settings',{cache:'no-store'})]);
  const [catalog,settings]=await Promise.all(responses.map(response=>response.json()));
  if(!responses[0].ok||!responses[1].ok||!settings.admin)throw new Error('تعذر تحميل إعدادات عرض الدورات.');
  if(active){setCourses(catalog.courses||[]);setItems(readPresentation(settings.settings?.academy_catalog));}
 }catch(err){if(active)setError(err instanceof Error?err.message:'تعذر التحميل.');}finally{if(active)setLoading(false);}})();return()=>{active=false;};},[]);
 const item=items[selected]||{};
 function update(value:Partial<CoursePresentation>){setItems(current=>({...current,[selected]:{...current[selected],...value}}));}
 async function save(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();if(!selected||busy)return;setBusy(true);setError('');setNotice('');
  try{const response=await fetch('/api/platform/site-settings',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({settings:{academy_catalog:JSON.stringify(items)}})});const result=await response.json();if(!response.ok)throw new Error(result.error||'تعذر الحفظ.');setNotice('تم حفظ تصنيف الدورة وغلافها واختيار ظهورها في الرئيسية.');}catch(err){setError(err instanceof Error?err.message:'تعذر الحفظ.');}finally{setBusy(false);}
 }
 return <section className="card"><h2>عرض الدورات في المعرض</h2><p className="muted">اختر المجال وغلاف الدورة والدورات المميزة في الرئيسية. عنوان الدورة وسعرها وحالة نشرها تُدار من إدارة الأكاديمية.</p>
  {loading?<p>جارٍ تحميل الدورات...</p>:<form onSubmit={save} style={{display:'grid',gap:14}}><label>الدورة<select value={selected} onChange={event=>{setSelected(event.target.value);setNotice('');}} disabled={busy}><option value="">اختر دورة</option>{courses.map(course=><option key={course.id} value={course.id}>{course.title||course.name||course.id}{course.status!=='published'?' (غير منشورة)':''}</option>)}</select></label>
  {selected && <><label>مجال التكوين<select value={item.field||''} onChange={event=>update({field:event.target.value as CoursePresentation['field']||undefined})} disabled={busy}><option value="">تصنيف تلقائي من وصف الدورة</option>{trainingFields.map(field=><option key={field.id} value={field.id}>{field.title}</option>)}</select></label>
   <label>رابط صورة الغلاف (HTTPS)<input type="url" maxLength={1500} placeholder="https://" value={item.cover||''} onChange={event=>update({cover:event.target.value})} disabled={busy}/></label>
   <label style={{display:'flex',gap:10,alignItems:'center'}}><input type="checkbox" checked={item.featured===true} onChange={event=>update({featured:event.target.checked})} disabled={busy}/> تمييز الدورة في الصفحة الرئيسية</label>
   <button className="btn primary" disabled={busy}>{busy?'جارٍ الحفظ...':'حفظ عرض الدورات'}</button></>}
  </form>}
  {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
 </section>;
}
