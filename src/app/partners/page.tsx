'use client';

import { PartnerApplicationForm } from '@/components/PartnerApplicationForm';
import { SectorHero } from '@/components/SectorHero';
import { useAslanLanguage } from '@/components/AslanLocale';

// Public partner landing copy; private application details remain governed by the API.
const content = {
  ar: {title:'الشراكات والتعاون',description:'بوابة مهنية لتقديم طلبات الشراكة والتوريد والتكوين وتنفيذ المشاريع.',portal:'فضاء الشركاء',rules:'قواعد التعاون',asideTitle:'لنطور الفرص معًا',asideBody:'قدّم طلبك بالمعلومات المطلوبة، وتابع نتيجة المراجعة داخل فضاء الشريك.',follow:'متابعة طلبات الشراكة',heading:'ابنِ شراكة مع ASLAN',intro:'نستقبل طلبات التوريد والتكوين وتنفيذ الخدمات والتعاون التجاري وفرص العمل. يُحفظ الطلب في قاعدة البيانات وتظهر رسالة نجاح فقط بعد استلام سجل محفوظ من الخادم.',bullets:['التوريد والتعاون مع الموردين.','التكوين والتدريب العملي.','تنفيذ الخدمات والمشاريع.','التعاون التجاري وفرص الكفاءات.']},
  fr: {title:'Partenariats et collaboration',description:'Un portail professionnel pour les partenariats, les fournisseurs, la formation et les projets.',portal:'Espace partenaires',rules:'Règles de collaboration',asideTitle:'Développons des opportunités ensemble',asideBody:'Envoyez votre demande et suivez son examen dans votre espace partenaire.',follow:'Suivre mes demandes',heading:'Devenez partenaire d’ASLAN',intro:'Nous accueillons les propositions de fournisseurs, de formation, de services, de collaboration commerciale et de talents. La confirmation apparaît uniquement après l’enregistrement de la demande.',bullets:['Fournisseurs et approvisionnement.','Formation professionnelle.','Prestations de services et projets.','Collaboration commerciale et talents.']},
  en: {title:'Partnerships and collaboration',description:'A professional portal for partnership, supply, training and project proposals.',portal:'Partner portal',rules:'Collaboration rules',asideTitle:'Build opportunities together',asideBody:'Submit your proposal and track its review in your partner portal.',follow:'Track partnership requests',heading:'Partner with ASLAN',intro:'We welcome supply, training, service delivery, business collaboration and talent proposals. A success message appears only after the request is saved by the server.',bullets:['Supply and vendor collaboration.','Professional training.','Service delivery and projects.','Business collaboration and talent opportunities.']},
  es: {title:'Alianzas y colaboración',description:'Portal profesional para propuestas de asociación, suministro, formación y proyectos.',portal:'Portal de socios',rules:'Normas de colaboración',asideTitle:'Creemos oportunidades juntos',asideBody:'Envía tu propuesta y sigue su revisión en el portal de socios.',follow:'Seguir solicitudes',heading:'Colabora con ASLAN',intro:'Recibimos propuestas de suministro, formación, servicios, colaboración comercial y talento. La confirmación aparece solo cuando el servidor guarda la solicitud.',bullets:['Suministro y proveedores.','Formación profesional.','Servicios y proyectos.','Colaboración comercial y talento.']},
  de: {title:'Partnerschaften und Zusammenarbeit',description:'Fachportal für Partnerschaften, Lieferanten, Schulungen und Projektvorschläge.',portal:'Partnerportal',rules:'Regeln der Zusammenarbeit',asideTitle:'Gemeinsam Chancen schaffen',asideBody:'Reichen Sie Ihren Vorschlag ein und verfolgen Sie die Prüfung im Partnerportal.',follow:'Anfragen verfolgen',heading:'Partner von ASLAN werden',intro:'Wir freuen uns über Vorschläge zu Lieferungen, Schulungen, Dienstleistungen, Geschäftspartnerschaften und Talenten. Eine Bestätigung erscheint erst nach erfolgreicher Speicherung.',bullets:['Lieferanten und Beschaffung.','Berufliche Weiterbildung.','Dienstleistungen und Projekte.','Geschäftliche Zusammenarbeit und Talente.']},
  pt: {title:'Parcerias e colaboração',description:'Portal profissional para propostas de parceria, fornecimento, formação e projetos.',portal:'Portal de parceiros',rules:'Regras de colaboração',asideTitle:'Criemos oportunidades juntos',asideBody:'Envie a sua proposta e acompanhe a análise no portal de parceiros.',follow:'Acompanhar pedidos',heading:'Seja parceiro da ASLAN',intro:'Recebemos propostas de fornecimento, formação, serviços, colaboração comercial e talentos. A confirmação só aparece depois de o servidor guardar o pedido.',bullets:['Fornecedores e abastecimento.','Formação profissional.','Serviços e projetos.','Colaboração comercial e talentos.']},
} as const;

export default function Partners() {
  const { language } = useAslanLanguage();
  const t = content[language];
  return (
    <main className="section">
      <div className="wrap">
        <SectorHero eyebrow="ASLAN PARTNERS" title={t.title} description={t.description}
          primary={{href:'/partners/portal',label:t.portal}}
          secondary={{href:'/guides/rules',label:t.rules}}
          aside={{title:t.asideTitle,description:t.asideBody,action:{href:'/partners/portal',label:t.follow}}}/>
        <div className="grid two" style={{ marginTop: 24, alignItems: 'start' }}>
          <section className="card">
            <h2>{t.heading}</h2>
            <p className="muted">{t.intro}</p>
            <ul>{t.bullets.map(item => <li key={item}>{item}</li>)}</ul>
          </section>
          <PartnerApplicationForm />
        </div>
      </div>
    </main>
  );
}
