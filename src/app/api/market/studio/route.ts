import {NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';
import {validateStore,validateListing} from '@/lib/market/catalog';
import {sameOrigin,validUuid} from '@/lib/academy/requests';
export const dynamic='force-dynamic';
async function context(){const db=await createClient();const {data:{user}}=await db.auth.getUser();const role=user?await db.rpc('has_role',{role_key:'super_admin'}):null;return {db,user,admin:role?.data===true&&!role.error};}
export async function GET(){
 const {db,user,admin}=await context();if(!user)return NextResponse.json({error:'سجل الدخول لفتح مكتب السوق.'},{status:401});
 let storeQuery=db.from('market_stores').select('*').order('created_at',{ascending:false});if(!admin)storeQuery=storeQuery.eq('owner_id',user.id);
 const stores=await storeQuery;const listings=await db.from('market_listing_submissions').select('*').order('created_at',{ascending:false}).limit(200);
 const categories=await db.from('categories').select('id,name').order('name');const orders=await db.rpc('market_seller_orders');
 if(stores.error||listings.error||categories.error||orders.error)return NextResponse.json({error:'تعذر تحميل مكتب السوق.'},{status:500});
 return NextResponse.json({stores:stores.data||[],listings:listings.data||[],categories:categories.data||[],orders:orders.data||[],admin});
}
export async function POST(request:Request){
 if(!sameOrigin(request))return NextResponse.json({error:'مصدر الطلب غير مسموح.'},{status:403});
 try{const {db,user}=await context();if(!user)return NextResponse.json({error:'سجّل الدخول لإرسال الطلب.'},{status:401});const body=await request.json();
 if(body.kind==='store'){const values=validateStore(body);if(!values||body.consent!==true)return NextResponse.json({error:'راجع بيانات المتجر والموافقة.'},{status:400});const result=await db.from('market_stores').insert({...values,owner_id:user.id,status:'submitted'}).select('id').single();if(result.error)return NextResponse.json({error:result.error.code==='23505'?'يوجد متجر لهذا الحساب أو اسم الرابط مستخدم.':'تعذر تقديم طلب المتجر.'},{status:result.error.code==='23505'?409:400});return NextResponse.json({id:result.data.id,message:'تم تقديم المتجر لمراجعة الإدارة.'},{status:201});}
 if(body.kind==='listing'){const values=validateListing(body);if(!values||typeof body.storeId!=='string'||!validUuid.test(body.storeId))return NextResponse.json({error:'راجع تفاصيل المنتج.'},{status:400});const store=await db.from('market_stores').select('id,owner_id,status').eq('id',body.storeId).eq('owner_id',user.id).eq('status','approved').maybeSingle();if(store.error||!store.data)return NextResponse.json({error:'المنتجات تتطلب متجرًا معتمدًا يخص حسابك.'},{status:403});const result=await db.from('market_listing_submissions').insert({...values,store_id:body.storeId,status:'submitted'}).select('id').single();if(result.error)return NextResponse.json({error:'تعذر تقديم المنتج للمراجعة.'},{status:400});return NextResponse.json({id:result.data.id,message:'تم إرسال المنتج للمراجعة. سيظهر بعد اعتماد الإدارة.'},{status:201});}
 return NextResponse.json({error:'نوع الطلب غير صالح.'},{status:400});
 }catch{return NextResponse.json({error:'صيغة الطلب غير صالحة.'},{status:400});}
}
export async function PATCH(request:Request){
 if(!sameOrigin(request))return NextResponse.json({error:'مصدر الطلب غير مسموح.'},{status:403});
 try{const {db,user,admin}=await context();if(!user)return NextResponse.json({error:'سجّل الدخول.'},{status:401});if(!admin)return NextResponse.json({error:'اعتماد المتاجر والمنتجات للإدارة.'},{status:403});
 const body=await request.json();if(typeof body.id!=='string'||!validUuid.test(body.id))return NextResponse.json({error:'المعرّف غير صالح.'},{status:400});
 if(body.kind==='store'&&['approved','rejected','suspended'].includes(body.status)){const result=await db.from('market_stores').update({status:body.status,updated_at:new Date().toISOString()}).eq('id',body.id).select('id').maybeSingle();if(result.error||!result.data)return NextResponse.json({error:'تعذر تحديث حالة المتجر.'},{status:400});return NextResponse.json({message:'تم تحديث حالة المتجر.'});}
 if(body.kind==='listing'&&typeof body.approve==='boolean'){const result=await db.rpc('market_review_listing',{p_id:body.id,p_approve:body.approve,p_note:typeof body.note==='string'?body.note:''});if(result.error)return NextResponse.json({error:'تعذر اعتماد المنتج. تحقق من حالة المتجر وطلب المنتج.'},{status:409});return NextResponse.json({productId:result.data,message:body.approve?'تم اعتماد المنتج ونشره وضبط مخزونه.':'تم رفض طلب المنتج.'});}
 return NextResponse.json({error:'قرار المراجعة غير صالح.'},{status:400});
 }catch{return NextResponse.json({error:'صيغة الطلب غير صالحة.'},{status:400});}
}
