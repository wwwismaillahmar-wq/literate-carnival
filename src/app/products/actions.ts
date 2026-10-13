'use server';
import {redirect} from 'next/navigation';import {createClient} from '@/lib/supabase/server';import {addToCart} from '@/domains/commerce/cart';
export async function addProductToCart(formData:FormData){
 const productId=Number(formData.get('product_id'));const quantity=Number(formData.get('quantity')||1);
 const db=await createClient();const result=await db.from('products').select('slug').eq('id',productId).eq('active',true).maybeSingle();const path=result.data?'/products/'+encodeURIComponent(result.data.slug):'/market';
 if(!Number.isSafeInteger(productId)||productId<1||!Number.isInteger(quantity)||quantity<1)redirect(path+'?error='+encodeURIComponent('أدخل كمية صحيحة.'));
 try{await addToCart(productId,quantity);}catch(err){const code=err instanceof Error?err.message:'';if(code==='AUTH_REQUIRED')redirect('/login?next='+encodeURIComponent(path));const errors:Record<string,string>={INSUFFICIENT_STOCK:'الكمية المطلوبة تتجاوز المخزون المتاح.',MINIMUM_ORDER_REQUIRED:'الكمية أقل من الحد الأدنى للمنتج.',PRODUCT_PRICE_REQUIRED:'اطلب تأكيد السعر قبل الشراء.',PRODUCT_NOT_AVAILABLE:'المنتج غير متاح للشراء الآن.'};redirect(path+'?error='+encodeURIComponent(errors[code]||'تعذر الإضافة إلى السلة. حاول مجددًا.'));}
 redirect('/cart?added='+productId);
}
