'use client';

import { useState } from 'react';

type UserOption = { id: string; full_name: string | null; username: string | null };
type LeadControl = { id: number; status: string; assigned_to: string | null; updated_at: string };
const statuses = [{value:'new',label:'جديد'},{value:'contacted',label:'تم التواصل'},{value:'qualified',label:'مؤهل'},{value:'closed',label:'مغلق'}];

export function LeadStatusControl({ lead: initialLead, users }: { lead: LeadControl; users: UserOption[] }) {
  const [status,setStatus]=useState(initialLead.status);
  const [assignee,setAssignee]=useState(initialLead.assigned_to??'');
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [busy,setBusy]=useState(false);

  async function save(){
    if(busy)return;setBusy(true);setError('');setNotice('');
    try{
      const response=await fetch('/api/crm/leads',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({leadId,status,assignedTo:assignee||null})});
      const result=await response.json() as {lead?:LeadControl;error?:string};
      if(!response.ok||!result.lead)throw new Error(result.error||'تعذر حفظ حالة العميل.');
      setStatus(result.lead.status);setAssignee(result.lead.assigned_to??'');setNotice('تم حفظ الحالة والتعيين مع تسجيل التغيير.');
    }catch(e){setError(e instanceof Error?e.message:'تعذر حفظ التحديث.');}finally{setBusy(false);}
  }

  return <div className="card" style={{display:'grid',gap:8,marginTop:12}}>
    <strong>حالة العميل وتعيين المسؤول</strong>
    <label>الحالة<select value={status} onChange={e=>setStatus(e.target.value)}>{statuses.map(s=><option key={s.value} value={s.value}>{s.label}</option>)}</select></label>
    <label>المسؤول<select value={assignee} onChange={e=>setAssignee(e.target.value)}><option value="">غير معيّن</option>{users.map(u=><option key={u.id} value={u.id}>{u.full_name||u.username||u.id}</option>)}</select></label>
    <button type="button" className="btn secondary" disabled={busy} onClick={()=>void save()}>{busy?'جارٍ الحفظ...':'حفظ الحالة والتعيين'}</button>
    {error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
  </div>;
}
