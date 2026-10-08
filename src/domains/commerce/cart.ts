import { createClient } from '@/lib/supabase/server';

export async function getActiveCart(){
 const db=await createClient(); const {data:{user}}=await db.auth.getUser(); if(!user) return null;
 const {data,error}=await db.from('carts').select('id,status,currency,cart_items(id,product_id,quantity,unit_price)').eq('user_id',user.id).eq('status','active').maybeSingle();
 if(error) throw error; return data;
}
export async function addToCart(productId:number,quantity=1){
 if(quantity<1) throw new Error('Invalid quantity');
 const db=await createClient(); const {data:{user}}=await db.auth.getUser(); if(!user) throw new Error('AUTH_REQUIRED');
 let {data:cart}=await db.from('carts').select('id').eq('user_id',user.id).eq('status','active').maybeSingle();
 if(!cart){const r=await db.from('carts').insert({user_id:user.id}).select('id').single(); if(r.error) throw r.error; cart=r.data;}
 const p=await db.from('products').select('price_dzd,active').eq('id',productId).single(); if(p.error) throw p.error; if(!p.data.active) throw new Error('PRODUCT_INACTIVE');
 const {error}=await db.from('cart_items').upsert({cart_id:cart.id,product_id:productId,quantity,unit_price:p.data.price_dzd},{onConflict:'cart_id,product_id'});
 if(error) throw error; return cart.id;
}
