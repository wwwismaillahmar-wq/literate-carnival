import { PartnerApplicationForm } from '@/components/PartnerApplicationForm';

export default function Partners() {
  return (
    <main className="section dark">
      <div className="wrap">
        <span className="kicker">PARTNERS / M36</span>
        <h1>الشراكات</h1>
        <div className="grid two" style={{ marginTop: 24, alignItems: 'start' }}>
          <section className="card">
            <h2>ابنِ شراكة مع ASLAN</h2>
            <p className="muted">نستقبل طلبات التوريد والتكوين وتنفيذ الخدمات والتعاون التجاري وفرص العمل. يُحفظ الطلب في قاعدة البيانات وتظهر رسالة نجاح فقط بعد استلام سجل محفوظ من الخادم.</p>
            <ul>
              <li>التوريد والتعاون مع الموردين.</li>
              <li>التكوين والتدريب العملي.</li>
              <li>تنفيذ الخدمات والمشاريع.</li>
              <li>التعاون التجاري وفرص الكفاءات.</li>
            </ul>
          </section>
          <PartnerApplicationForm />
        </div>
      </div>
    </main>
  );
}
