'use client';
import Image from 'next/image';
import { useAslanLanguage } from '@/components/AslanLocale';
import Link from 'next/link';
import { Clock3 } from 'lucide-react';
import { fieldTitle, type AcademyCourse } from '@/lib/academy/catalog';
import { TrainingIcon } from './TrainingIcon';
import styles from './AcademyExperience.module.css';
export function AcademyCourseCard({ course }: { course: AcademyCourse }) {
  const {language}=useAslanLanguage();
  const copy=courseCardCopy[language];
  return <article className={styles.course}>
    <Link className={styles.cover} href={'/academy/' + encodeURIComponent(course.id)} aria-label={copy.details+' '+course.title}>
      {course.cover ? <Image src={course.cover} alt="" width={720} height={420} unoptimized loading="lazy" referrerPolicy="no-referrer" /> : <TrainingIcon field={course.field} size={68}/>}
      <span className={styles.coverLabel}>{fieldLabels[language][course.field] ?? fieldTitle(course.field)}</span>
    </Link>
    <div className={styles.body}><h3><Link href={'/academy/' + encodeURIComponent(course.id)}>{course.title}</Link></h3>
      <p>{course.description || copy.fallback}</p>
      <div className={styles.meta}>{course.duration && <span><Clock3 size={14} aria-hidden="true" style={{display:'inline',verticalAlign:'middle'}}/> {course.duration}</span>}<strong>{course.price===null?copy.undisclosed:course.price===0?copy.free:new Intl.NumberFormat(language==='ar'?'ar-DZ':language).format(course.price)+' '+copy.currency}</strong></div>
      <div className={styles.cardActions}><Link className="btn secondary" href={'/academy/' + encodeURIComponent(course.id)}>{copy.details}</Link><Link className="btn primary" href={'/academy/join?course=' + encodeURIComponent(course.id)}>{copy.join}</Link></div>
    </div>
  </article>;
}

const courseCardCopy={
 ar:{details:'تفاصيل الدورة',join:'طلب الالتحاق',fallback:'افتح صفحة الدورة للاطلاع على البرنامج والتفاصيل المتاحة.',undisclosed:'السعر غير معلن',free:'مجانية',currency:'دج'},
 fr:{details:'Détails du cours',join:'Demander une inscription',fallback:'Consultez la page du cours pour connaître le programme.',undisclosed:'Prix non communiqué',free:'Gratuit',currency:'DZD'},
 en:{details:'Course details',join:'Request enrollment',fallback:'Open the course page for the available program details.',undisclosed:'Price not listed',free:'Free',currency:'DZD'},
 es:{details:'Detalles del curso',join:'Solicitar inscripción',fallback:'Consulta el programa en la página del curso.',undisclosed:'Precio no disponible',free:'Gratis',currency:'DZD'},
 de:{details:'Kursdetails',join:'Anmeldung anfragen',fallback:'Weitere Informationen auf der Kursseite.',undisclosed:'Preis nicht angegeben',free:'Kostenlos',currency:'DZD'},
 pt:{details:'Detalhes do curso',join:'Solicitar inscrição',fallback:'Consulte o programa na página do curso.',undisclosed:'Preço não indicado',free:'Grátis',currency:'DZD'}
} as const;
const fieldLabels:Record<keyof typeof courseCardCopy,Record<AcademyCourse['field'],string>>={
 ar:{upholstery:'التنجيد والديكور',sewing:'الخياطة والتفصيل',electrical:'الكهرباء الصناعية',cooling:'التبريد والتكييف',plumbing:'التدفئة والأنابيب',general:'تكوين مهني'},
 fr:{upholstery:'Tapisserie et décoration',sewing:'Couture et confection',electrical:'Électricité industrielle',cooling:'Réfrigération et climatisation',plumbing:'Chauffage et plomberie',general:'Formation professionnelle'},
 en:{upholstery:'Upholstery and interior design',sewing:'Sewing and tailoring',electrical:'Industrial electricity',cooling:'Cooling and air conditioning',plumbing:'Heating and plumbing',general:'Vocational training'},
 es:{upholstery:'Tapicería y decoración',sewing:'Costura y confección',electrical:'Electricidad industrial',cooling:'Refrigeración y climatización',plumbing:'Calefacción y fontanería',general:'Formación profesional'},
 de:{upholstery:'Polsterei und Innendesign',sewing:'Nähen und Schneidern',electrical:'Industrieelektrik',cooling:'Kälte- und Klimatechnik',plumbing:'Heizung und Sanitär',general:'Berufliche Weiterbildung'},
 pt:{upholstery:'Estofamento e decoração',sewing:'Costura e alfaiataria',electrical:'Eletricidade industrial',cooling:'Refrigeração e climatização',plumbing:'Aquecimento e canalização',general:'Formação profissional'}
};
