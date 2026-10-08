import { getActiveCart } from '@/domains/commerce/cart';

type CartItemRow = {
  id: string;
  product_id: number;
  quantity: number;
  unit_price: number;
};

type CartRow = {
  cart_items: CartItemRow[];
};

export default async function CartPage() {
  const cart = (await getActiveCart()) as CartRow | null;
  return (
    <main className="section">
      <div className="wrap">
        <span className="kicker">M14 / CART</span>
        <h1>السلة</h1>
        {!cart ? (
          <article className="card"><p>سجل الدخول لعرض السلة.</p></article>
        ) : (
          <div className="grid">
            {cart.cart_items.map((x) => (
              <article className="card" key={x.id}>
                <h2>Product #{x.product_id}</h2>
                <p>الكمية: {x.quantity} · السعر: {x.unit_price} DZD</p>
              </article>
            ))}
            {!cart.cart_items.length && <article className="card"><p>السلة فارغة.</p></article>}
          </div>
        )}
      </div>
    </main>
  );
}
