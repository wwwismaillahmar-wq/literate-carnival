import { trainingFields, safeCover, safeInternalLink } from './catalog';
export function validPresentation(value:string):boolean {
  try {
    const parsed:unknown=JSON.parse(value||'{}');
    if(!parsed||typeof parsed!=='object'||Array.isArray(parsed)||Object.keys(parsed).length>500)return false;
    return Object.entries(parsed).every(([id,item])=>{
      if(!/^[a-zA-Z0-9-]{1,120}$/.test(id)||!item||typeof item!=='object'||Array.isArray(item))return false;
      const row=item as Record<string,unknown>;
      if(Object.keys(row).some(key=>!['field','cover','featured'].includes(key)))return false;
      if(row.field!==undefined&&row.field!==''&&!trainingFields.some(field=>field.id===row.field))return false;
      if(row.featured!==undefined&&typeof row.featured!=='boolean')return false;
      return row.cover===undefined || row.cover==='' || (typeof row.cover==='string'&&Boolean(safeCover(row.cover)));
    });
  }catch{return false;}
}
export function validAcademyLink(value:string):boolean {return !value || safeInternalLink(value)===value;}
