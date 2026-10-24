'use client';
import { useState } from 'react';
import { useAslanLanguage } from '@/components/AslanLocale';
import Link from 'next/link';
import { filterCourses, trainingFields, type AcademyCourse } from '@/lib/academy/catalog';
import { AcademyCourseCard } from './AcademyCourseCard';
import styles from './AcademyExperience.module.css';
export function AcademyCatalog({ courses, initialField = '', error = false }: { courses: AcademyCourse[]; initialField?: string; error?: boolean }) {
  const {language}=useAslanLanguage();
  const copy=academyCopy[language];
  const [field,setField] = useState(initialField);
  const [query,setQuery] = useState('');
  const shown = filterCourses(courses,field,query);
  return <section id="courses" className={styles.section} aria-labelledby="courses-heading">
    <div className={styles.heading}><div><span className={styles.eyebrow}>{copy.eyebrow}</span><h2 id="courses-heading">{copy.title}</h2><p>{copy.description}</p></div><Link href="/account/academy" className="btn secondary">{copy.myAcademy}</Link></div>
    <div className={styles.toolbar}><label>{copy.search}<input type="search" placeholder={copy.placeholder} value={query} onChange={event=>setQuery(event.target.value)}/></label><label>{copy.field}<select value={field} onChange={event=>setField(event.target.value)}><option value="">{copy.allFields}</option>{trainingFields.map(item=><option value={item.id} key={item.id}>{fieldNames[language]?.[item.id] ?? item.title}</option>)}<option value="general">{copy.general}</option></select></label></div>
    {error ? <div className={styles.empty} role="alert"><h3>{copy.loadError}</h3><p>{copy.retry}</p><Link href="/contact">{copy.contact}</Link></div> : <>
      <p className={styles.count} role="status" aria-live="polite">{shown.length} {copy.published}{field ? copy.inField : ''}</p>
      {shown.length ? <div className={styles.gallery}>{shown.map(course=><AcademyCourseCard course={course} key={course.id}/>)}</div> : <div className={styles.empty}><h3>{courses.length ? copy.noMatches : copy.noCourses}</h3><p>{courses.length ? copy.tryAgain : copy.future}</p>{courses.length ? <button className="btn secondary" onClick={()=>{setField('');setQuery('');}}>{copy.allCourses}</button> : <Link className="btn secondary" href="/contact">{copy.inquire}</Link>}</div>}
    </>}
  </section>;
}

const academyCopy={
 ar:{eyebrow:'معرض البرامج',title:'الدورات الإلكترونية والتكوين',description:'استكشف البرنامج، راجع التفاصيل، ثم اختر مسار التحاقك.',myAcademy:'مساحتي الدراسية',search:'ابحث عن دورة',placeholder:'اسم الدورة أو المهارة التي تريد تعلمها',field:'مجال التكوين',allFields:'كل المجالات',general:'تكوين مهني عام',loadError:'تعذر تحميل الدورات',retry:'حاول تحديث الصفحة أو تواصل معنا للمساعدة.',contact:'تواصل مع الأكاديمية',noMatches:'لا توجد دورات تطابق اختيارك',noCourses:'الدورات ستظهر هنا عند فتح برامج التكوين',tryAgain:'جرّب مجالًا آخر أو غيّر كلمات البحث.',future:'يمكنك استكشاف المجالات والتواصل مع الأكاديمية لمعرفة البرامج المقبلة.',allCourses:'عرض كل الدورات',inquire:'استفسر عن التكوين',published:'دورة منشورة',inField:' في المجال المختار'},
 fr:{eyebrow:'Catalogue',title:'Cours en ligne et formations',description:'Explorez les programmes et choisissez votre parcours.',myAcademy:'Mon espace',search:'Rechercher un cours',placeholder:'Nom du cours ou compétence',field:'Domaine',allFields:'Tous les domaines',general:'Formation générale',loadError:'Chargement impossible',retry:'Actualisez la page ou contactez-nous.',contact:'Contacter l’académie',noMatches:'Aucun cours correspondant',noCourses:'Les cours seront bientôt disponibles',tryAgain:'Essayez une autre recherche.',future:'Explorez les domaines et contactez-nous.',allCourses:'Tous les cours',inquire:'Se renseigner',published:'cours publiés',inField:' dans ce domaine'},
 en:{eyebrow:'Programs',title:'Online courses and training',description:'Explore programs and choose your learning path.',myAcademy:'My learning',search:'Find a course',placeholder:'Course name or skill',field:'Training field',allFields:'All fields',general:'General training',loadError:'Unable to load courses',retry:'Refresh or contact support.',contact:'Contact academy',noMatches:'No matching courses',noCourses:'Courses will appear when published',tryAgain:'Try another field or search.',future:'Explore fields and contact us for upcoming courses.',allCourses:'Show all courses',inquire:'Ask about training',published:'published courses',inField:' in selected field'},
 es:{eyebrow:'Programas',title:'Cursos en línea y formación',description:'Explora programas y elige tu itinerario.',myAcademy:'Mi aprendizaje',search:'Buscar curso',placeholder:'Curso o habilidad',field:'Área de formación',allFields:'Todas las áreas',general:'Formación general',loadError:'No se pudieron cargar los cursos',retry:'Actualiza o contacta con soporte.',contact:'Contactar academia',noMatches:'No hay cursos coincidentes',noCourses:'Los cursos aparecerán cuando se publiquen',tryAgain:'Prueba otra búsqueda.',future:'Explora las áreas y consulta próximos cursos.',allCourses:'Todos los cursos',inquire:'Consultar formación',published:'cursos publicados',inField:' en esta área'},
 de:{eyebrow:'Programme',title:'Online-Kurse und Weiterbildung',description:'Programme entdecken und Lernweg wählen.',myAcademy:'Mein Lernbereich',search:'Kurs suchen',placeholder:'Kurs oder Fähigkeit',field:'Fachbereich',allFields:'Alle Bereiche',general:'Allgemeine Weiterbildung',loadError:'Kurse konnten nicht geladen werden',retry:'Bitte neu laden oder Support kontaktieren.',contact:'Akademie kontaktieren',noMatches:'Keine passenden Kurse',noCourses:'Kurse erscheinen nach Veröffentlichung',tryAgain:'Andere Suche versuchen.',future:'Bereiche entdecken und nach Kursen fragen.',allCourses:'Alle Kurse',inquire:'Weiterbildung anfragen',published:'veröffentlichte Kurse',inField:' im Bereich'},
 pt:{eyebrow:'Programas',title:'Cursos online e formação',description:'Explore programas e escolha seu percurso.',myAcademy:'Minha aprendizagem',search:'Buscar curso',placeholder:'Curso ou competência',field:'Área de formação',allFields:'Todas as áreas',general:'Formação geral',loadError:'Não foi possível carregar cursos',retry:'Atualize ou contacte o suporte.',contact:'Contactar academia',noMatches:'Nenhum curso encontrado',noCourses:'Os cursos aparecerão após publicação',tryAgain:'Tente outra pesquisa.',future:'Explore as áreas e pergunte pelos próximos cursos.',allCourses:'Todos os cursos',inquire:'Informações sobre formação',published:'cursos publicados',inField:' nesta área'}
} as const;

// Labels are localized without changing the stable training field IDs used for filtering.
const fieldNames:Record<string,Record<string,string>>={
 ar:{upholstery:'التنجيد والديكور',sewing:'الخياطة والتفصيل',electrical:'الكهرباء الصناعية',cooling:'التبريد والتكييف',plumbing:'التدفئة والأنابيب'},
 fr:{upholstery:'Tapisserie et décoration',sewing:'Couture et confection',electrical:'Électricité industrielle',cooling:'Réfrigération et climatisation',plumbing:'Chauffage et plomberie'},
 en:{upholstery:'Upholstery and interior design',sewing:'Sewing and tailoring',electrical:'Industrial electricity',cooling:'Cooling and air conditioning',plumbing:'Heating and plumbing'},
 es:{upholstery:'Tapicería y decoración',sewing:'Costura y confección',electrical:'Electricidad industrial',cooling:'Refrigeración y climatización',plumbing:'Calefacción y fontanería'},
 de:{upholstery:'Polsterei und Innendesign',sewing:'Nähen und Schneidern',electrical:'Industrieelektrik',cooling:'Kälte- und Klimatechnik',plumbing:'Heizung und Sanitär'},
 pt:{upholstery:'Estofamento e decoração',sewing:'Costura e alfaiataria',electrical:'Eletricidade industrial',cooling:'Refrigeração e climatização',plumbing:'Aquecimento e canalização'}
};
