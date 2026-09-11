const products = [
  {
    number: '01',
    title: 'التنجيد والأثاث',
    description: 'منتجات تنجيد وأثاث بتصميم وتنفيذ احترافي.',
    action: 'اطلب المنتج',
  },
  {
    number: '02',
    title: 'الخياطة والتفصيل',
    description: 'منتجات وأعمال تفصيل حسب المقاس والطلب.',
    action: 'اطلب الآن',
  },
  {
    number: '03',
    title: 'منتجات مخصصة',
    description: 'حلول خاصة للأفراد والمحلات والمشاريع.',
    action: 'اطلب عرضًا',
  },
];

const services = [
  {
    number: '01',
    title: 'تجهيز المحلات',
    description: 'تصميم وتنفيذ وتجهيز المساحات التجارية.',
  },
  {
    number: '02',
    title: 'التنجيد والديكور',
    description: 'تنفيذ أعمال ومنتجات حسب المقاسات والاحتياجات.',
  },
  {
    number: '03',
    title: 'الخدمات التقنية',
    description: 'خدمات مهنية وتقنية ضمن أنشطة المجموعة.',
  },
];

const courses = [
  'الكهرباء الصناعية',
  'التبريد والتكييف',
  'التدفئة والأنابيب',
  'التنجيد والديكور',
];

export default function HomePage() {
  return (
    <main id="home">
      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <span className="kicker">ASLAN MODELLING</span>

            <h1>
              علامة تجمع <em>الحرفة</em>، الجودة، والتكوين.
            </h1>

            <p>
              منصة رقمية للمنتجات والخدمات والدورات التكوينية،
              مع بوابة مستقلة للشركاء.
            </p>

            <div className="actions">
              <a className="btn gold" href="#products">
                استكشف المنتجات
              </a>

              <a className="btn line" href="#services">
                اطلب خدمة
              </a>
            </div>
          </div>

          <div className="logo-card">
            <div className="aslan-mark">ASLAN</div>
            <div className="aslan-model">modelling</div>
            <p>تنجيد • خياطة • تفصيل</p>
          </div>
        </div>
      </section>

      <section id="products" className="section">
        <div className="wrap">
          <div className="head">
            <div>
              <span className="kicker">MARKET</span>
              <h2>المنتجات</h2>
            </div>

            <span>بوابة البيع</span>
          </div>

          <div className="grid three">
            {products.map((product) => (
              <article key={product.number} className="card">
                <div className="icon">{product.number}</div>

                <h3>{product.title}</h3>

                <p>{product.description}</p>

                <a href="#contact">{product.action} ←</a>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="services" className="section dark">
        <div className="wrap">
          <div className="head">
            <div>
              <span className="kicker">SERVICES</span>
              <h2>الخدمات</h2>
            </div>

            <span>مشاريع وتنفيذ</span>
          </div>

          <div className="grid three">
            {services.map((service) => (
              <article key={service.number} className="service card">
                <b>{service.number}</b>

                <h3>{service.title}</h3>

                <p>{service.description}</p>

                <a href="#contact">اطلب الخدمة ←</a>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="courses" className="section">
        <div className="wrap">
          <div className="head">
            <div>
              <span className="kicker">ACADEMY</span>
              <h2>الدورات التكوينية</h2>
            </div>

            <span>تعلم وتطور</span>
          </div>

          <div className="course card">
            <div>
              <h3>منصة التكوين المهني</h3>

              <p>
                نبدأ بدورات إلكترونية منظمة، ثم نضيف حسابات
                المتدربين، الدروس، الاختبارات، الشهادات والدفع
                الإلكتروني عند جاهزية النظام.
              </p>

              <a className="btn gold" href="#contact">
                سجل اهتمامك
              </a>
            </div>

            <ul>
              {courses.map((course) => (
                <li key={course}>{course}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section id="partners" className="section dark">
        <div className="wrap">
          <div className="head">
            <div>
              <span className="kicker">PARTNERS</span>
              <h2>الشركاء</h2>
            </div>

            <span>بوابة مستقلة</span>
          </div>

          <div className="partner card">
            <div>
              <h3>كن شريكًا مع ASLAN</h3>

              <p>
                صفحة للتعريف بفرص الشراكة واستقبال طلبات الأفراد
                والمؤسسات، مع تطويرها لاحقًا إلى حساب شريك وإدارة
                اتفاقيات ومستحقات ووثائق.
              </p>
            </div>

            <a className="btn gold" href="#contact">
              تقديم طلب شراكة
            </a>
          </div>
        </div>
      </section>

      <section id="about" className="section">
        <div className="wrap narrow">
          <span className="kicker">ABOUT</span>

          <h2>عن ASLAN modelling</h2>

          <p>
            نبني منصة تجمع النشاط التجاري، الخدمات، والتكوين في
            نظام واحد قابل للتوسع.
          </p>

          <p>
            الهوية البصرية تعتمد على الذهبي والأزرق الداكن والرموز
            المرتبطة بالحرفة.
          </p>

          <div className="pillars">
            <span>المنتجات</span>
            <span>الخدمات</span>
            <span>التكوين</span>
            <span>الشراكات</span>
          </div>
        </div>
      </section>

      <section id="contact" className="section contact">
        <div className="wrap contact-grid">
          <div>
            <span className="kicker">CONTACT CENTER</span>

            <h2>مركز التواصل والطلبات</h2>

            <p>
              طلبات المنتجات، الخدمات، الدورات، الشراكات،
              الاستعلامات والشكاوى ستجمع هنا في النسخة الأولى،
              ثم تربط بنظام إدارة متكامل.
            </p>

            <div className="links">
              <span>الهاتف</span>
              <span>WhatsApp</span>
              <span>البريد الإلكتروني</span>
              <span>Facebook / Instagram / TikTok</span>
            </div>
          </div>

          <div className="card contact-box">
            <h3>أرسل طلبك</h3>

            <p>
              اختر نوع الطلب وسنربطه لاحقًا بنظام الطلبات وقاعدة
              البيانات الفعلية.
            </p>

            <div className="contact-actions">
              <a className="btn gold" href="#products">
                المنتجات
              </a>

              <a className="btn line" href="#services">
                الخدمات
              </a>

              <a className="btn line" href="#courses">
                الدورات
              </a>

              <a className="btn line" href="#partners">
                الشراكة
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}