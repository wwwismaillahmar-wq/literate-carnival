import { PartnerApplicationForm } from '@/components/PartnerApplicationForm';
import { SectorHero } from '@/components/SectorHero';

export default function Partners() {
  return (
    <main className="section">
      <div className="wrap">
        <SectorHero eyebrow="ASLAN PARTNERS" title="الشراكات والتعاون" description="بوابة مهنية لتقديم طلبات الشراكة والتوريد والتكوين وتنفيذ المشاريع." primary={{href:'/partners/portal',label:'فضاء الشركاء'}} secondary={{href:'/guides/rules',label:'قواعد التعاون'}} aside={{title:'لنطور الفرص معًا',description:'قدّم طلبك بالمعلومات المطلوبة، وتابع نتيجة المراجعة داخل فضاء الشريك.',action:{href:'/partners/portal',label:'متابعة طلبات الشراكة'}}}/>
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
