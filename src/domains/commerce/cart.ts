import {createClient} from '@/lib/supabase/server';
export async function getActiveCart(){const db=await createClient();const {data:{user}}=await db.auth.getUser();if(!user)return null;const {data,error}=await db.from('carts').select('id,status,currency,cart_items(id,product_id,quantity,unit_price)').eq('user_id',user.id).eq('status','active').maybeSingle();if(error)throw error;return data;}
export async function addToCart(productId:number,quantity=1,replace=false){
 if(!Number.isSafeInteger(productId)||productId<1||!Number.isInteger(quantity)||quantity<1||quantity>1000000)throw new Error('INVALID_QUANTITY');
 const db=await createClient();const {data:{user}}=await db.auth.getUser();if(!user)throw new Error('AUTH_REQUIRED');
 const result=await db.rpc('market_add_cart_item',{p_product_id:productId,p_quantity:quantity,p_replace:replace});
 if(result.error)throw new Error(result.error.message.split(':')[0]);return result.data;
}
