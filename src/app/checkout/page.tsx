import { getActiveCart } from '@/domains/commerce/cart';
import { submitCheckout } from './actions';

type CheckoutPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  const cart = await getActiveCart();
  const params = searchParams ? await searchParams : {};
  const errorValue = params.error;
  const error = Array.isArray(errorValue) ? errorValue[0] : errorValue;

  return (
    <main className="section">
      <div className="wrap" style={{ maxWidth: 920 }}>
        <span className="kicker">M14 / CHECKOUT</span>
        <h1>إتمام الطلب</h1>

        {!cart ? (
          <article className="card">
            <p>لا توجد سلة نشطة.</p>
          </article>
        ) : (
          <div style={{ display: 'grid', gap: 20 }}>
            {error ? (
              <article className="card" role="alert" style={{ border: '1px solid #b42318' }}>
                <strong>تعذر إتمام الطلب</strong>
                <p>{error}</p>
              </article>
            ) : null}

            <article className="card">
              <p>
                عدد العناصر في السلة: <strong>{(cart.cart_items ?? []).length}</strong>
              </p>
              <p>
                سيتم تثبيت الطلب، حجز المخزون، وإنشاء الفاتورة في معاملة واحدة. الدفع الإلكتروني
                يتم عبر طبقة M15 عندما يكون مزود الدفع مفعّلًا.
              </p>
            </article>

            <form action={submitCheckout} className="card" style={{ display: 'grid', gap: 14 }}>
              <h2>بيانات التوصيل</h2>

              <label>
                اسم المستلم
                <input name="recipient_name" required />
              </label>

              <label>
                الهاتف
                <input name="phone" inputMode="tel" required />
              </label>

              <label>
                الولاية
                <input name="wilaya" required />
              </label>

              <label>
                البلدية
                <input name="commune" />
              </label>

              <label>
                العنوان
                <textarea name="address" required rows={3} />
              </label>

              <label>
                ملاحظات
                <textarea name="notes" rows={3} />
              </label>

              <button type="submit" className="button button-gold">
                تأكيد الطلب
              </button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
