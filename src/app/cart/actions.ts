'use server';
import {redirect} from 'next/navigation';import {createClient} from '@/lib/supabase/server';import {addToCart} from '@/domains/commerce/cart';import {validUuid} from '@/lib/academy/requests';
export async function changeCartItem(formData:FormData){
 const id=String(formData.get('item_id')||'');const action=String(formData.get('action')||'');if(!validUuid.test(id)||!['quantity','remove'].includes(action))redirect('/cart?error='+encodeURIComponent('بيانات السلة غير صالحة.'));
 const db=await createClient();const {data:{user}}=await db.auth.getUser();if(!user)redirect('/login?next=/cart');
 const cart=await db.from('carts').select('id').eq('user_id',user.id).eq('status','active').maybeSingle();
 const item=cart.data?await db.from('cart_items').select('id,product_id').eq('id',id).eq('cart_id',cart.data.id).maybeSingle():null;
 if(!item?.data)redirect('/cart?error='+encodeURIComponent('العنصر غير موجود في سلتك النشطة.'));
 if(action==='remove'){const result=await db.from('cart_items').delete().eq('id',id).eq('cart_id',cart.data!.id);if(result.error)redirect('/cart?error='+encodeURIComponent('تعذر إزالة العنصر.'));}
 else{const quantity=Number(formData.get('quantity'));try{await addToCart(item.data.product_id,quantity,true);}catch{redirect('/cart?error='+encodeURIComponent('تعذر تعديل الكمية. تحقق من المخزون والحد الأدنى.'));}}
 redirect('/cart?updated=1');
}
