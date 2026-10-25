'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {useAslanLanguage} from '@/components/AslanLocale';
const serviceCopy={
 ar:{search:'ابحث عن خدمة',placeholder:'ابحث عن الكهرباء أو التنجيد أو التكييف...',submit:'بحث',requests:'طلباتي',help:'المساعدة',nav:'روابط الخدمات',hero:'خدمات احترافية. من الطلب إلى الإنجاز.',intro:'اكتشف خدمات المؤسسة المهنية، حدّد احتياجك، واطلب دراسة وعرض سعر.',explore:'استكشف الخدمات',request:'تقديم طلب خدمة',eyebrow:'ASLAN SERVICES · حلول مهنية لمشاريعك',heroAria:'اكتشف خدمات ASLAN',asideTitle:'مشروعك يبدأ بطلب واضح',asideDescription:'أرسل وصف العمل والوقت المفضل. تراجع الإدارة التفاصيل وتصدر عرض السعر، ثم يتم الاتفاق على موعد التنفيذ.',asideAction:'اطلب عرضًا للخدمة ←',categoriesTitle:'تصفح حسب المجال',categoriesDescription:'تعرّف على اختصاصات ASLAN، دون خلط الخدمات بسوق المنتجات.',catalogTitle:'دليل خدمات ASLAN',catalogDescription:'الخدمات المفعّلة والمعتمدة في كتالوج المؤسسة.'},
 fr:{search:'Rechercher un service',placeholder:'Électricité, tapisserie, climatisation...',submit:'Rechercher',requests:'Mes demandes',help:'Aide',nav:'Liens services',hero:'Services professionnels, de la demande à la réalisation.',intro:'Explorez nos services et demandez un devis.',explore:'Découvrir les services',request:'Demander un service',eyebrow:'ASLAN SERVICES · Des solutions pour vos projets',heroAria:'Découvrez les services ASLAN',asideTitle:'Votre projet commence par une demande claire',asideDescription:'Décrivez votre projet et vos disponibilités. Notre équipe examine votre demande avant de proposer un devis et un rendez-vous.',asideAction:'Demander un devis ←',categoriesTitle:'Par domaine',categoriesDescription:'Découvrez les spécialités ASLAN, distinctes du marché des produits.',catalogTitle:'Catalogue des services ASLAN',catalogDescription:'Les services actifs et approuvés de notre catalogue.'},
 en:{search:'Find a service',placeholder:'Electrical, upholstery, air conditioning...',submit:'Search',requests:'My requests',help:'Help',nav:'Service links',hero:'Professional services, from request to delivery.',intro:'Explore our professional services and request a quote.',explore:'Explore services',request:'Request a service',eyebrow:'ASLAN SERVICES · Solutions for your projects',heroAria:'Explore ASLAN services',asideTitle:'Your project starts with a clear request',asideDescription:'Describe the work and your preferred timing. Our team reviews the details, provides a quote and agrees a delivery schedule.',asideAction:'Request a quote ←',categoriesTitle:'Browse by field',categoriesDescription:'Explore ASLAN specializations, separate from the product marketplace.',catalogTitle:'ASLAN service directory',catalogDescription:'Active and approved services in our catalog.'},
 es:{search:'Buscar servicio',placeholder:'Electricidad, tapicería, climatización...',submit:'Buscar',requests:'Mis solicitudes',help:'Ayuda',nav:'Enlaces de servicios',hero:'Servicios profesionales, de la solicitud a la entrega.',intro:'Explora nuestros servicios y solicita presupuesto.',explore:'Explorar servicios',request:'Solicitar servicio',eyebrow:'ASLAN SERVICES · Soluciones para tus proyectos',heroAria:'Explora los servicios ASLAN',asideTitle:'Tu proyecto empieza con una solicitud clara',asideDescription:'Describe el trabajo y tus horarios. Nuestro equipo revisará los detalles, preparará un presupuesto y acordará una fecha.',asideAction:'Solicitar presupuesto ←',categoriesTitle:'Explorar por área',categoriesDescription:'Descubre las especialidades ASLAN, separadas del mercado de productos.',catalogTitle:'Directorio de servicios ASLAN',catalogDescription:'Servicios activos y aprobados en nuestro catálogo.'},
 de:{search:'Dienst suchen',placeholder:'Elektrik, Polsterei, Klimaanlagen...',submit:'Suchen',requests:'Meine Anfragen',help:'Hilfe',nav:'Service-Links',hero:'Professionelle Dienstleistungen von Anfrage bis Lieferung.',intro:'Entdecken Sie unsere Leistungen und fordern Sie ein Angebot an.',explore:'Leistungen entdecken',request:'Service anfragen',eyebrow:'ASLAN SERVICES · Lösungen für Ihre Projekte',heroAria:'ASLAN-Dienstleistungen entdecken',asideTitle:'Ihr Projekt beginnt mit einer klaren Anfrage',asideDescription:'Beschreiben Sie die Arbeiten und Ihren Wunschtermin. Unser Team prüft die Angaben, erstellt ein Angebot und vereinbart einen Termin.',asideAction:'Angebot anfordern ←',categoriesTitle:'Nach Fachbereich',categoriesDescription:'Entdecken Sie ASLAN-Fachgebiete unabhängig vom Produktmarkt.',catalogTitle:'ASLAN-Dienstleistungsverzeichnis',catalogDescription:'Aktive und freigegebene Leistungen in unserem Katalog.'},
 pt:{search:'Buscar serviço',placeholder:'Elétrica, estofamento, ar-condicionado...',submit:'Buscar',requests:'Meus pedidos',help:'Ajuda',nav:'Links de serviços',hero:'Serviços profissionais, do pedido à entrega.',intro:'Explore os nossos serviços e solicite orçamento.',explore:'Explorar serviços',request:'Solicitar serviço',eyebrow:'ASLAN SERVICES · Soluções para os seus projetos',heroAria:'Explore os serviços ASLAN',asideTitle:'O seu projeto começa com um pedido claro',asideDescription:'Descreva o trabalho e o horário preferido. A nossa equipa analisa os detalhes, apresenta um orçamento e combina uma data.',asideAction:'Pedir orçamento ←',categoriesTitle:'Explorar por área',categoriesDescription:'Conheça as especialidades ASLAN, separadas do mercado de produtos.',catalogTitle:'Diretório de serviços ASLAN',catalogDescription:'Serviços ativos e aprovados no nosso catálogo.'}
} as const;
import {
  Armchair, CalendarDays, CheckCircle2, ClipboardList, Droplets, Factory,
  Grid3X3, MapPin, Search, Scissors, SlidersHorizontal, Snowflake, Wrench, Zap,
  type LucideIcon,
} from 'lucide-react';
import {
  serviceCategories, serviceCategory, categoryLabel, serviceRequestUrl,
  type AslanService, type ServiceCategory,
} from '@/lib/services/catalog';
import styles from './Services.module.css';

const iconsByCategory: Record<ServiceCategory, LucideIcon> = {
  all: Grid3X3, craft: Armchair, electrical: Zap, climate: Snowflake,
  water: Droplets, other: Wrench,
};
const iconsBySlug: Record<string, LucideIcon> = {
  'upholstery': Armchair, 'sewing-tailoring': Scissors, electrical: Zap,
  'workshop-setup': Factory, 'refrigeration-ac': Snowflake,
  'plumbing-heating': Droplets, irrigation: Droplets,
};

export function ServicesCatalog({ services, initialQuery = '', initialCategory = '', error = false }: {
  services: AslanService[]; initialQuery?: string; initialCategory?: string; error?: boolean;
}) {
  const {language}=useAslanLanguage();const copy=serviceCopy[language];
  const initial = serviceCategories.some(item => item.id === initialCategory) ? initialCategory as ServiceCategory : 'all';
  const [category, setCategory] = useState<ServiceCategory>(initial);
  const [query, setQuery] = useState(initialQuery.slice(0, 120));
  const [sort, setSort] = useState('name');
  const [showFilters, setShowFilters] = useState(false);
  const results = useMemo(() => {
    const needle = query.trim().normalize('NFKC').toLocaleLowerCase('ar');
    return services.filter(service => (category === 'all' || serviceCategory(service) === category) &&
      (!needle || (service.name + ' ' + service.description).normalize('NFKC').toLocaleLowerCase('ar').includes(needle)))
      .sort((a, b) => sort === 'name-reverse'
        ? b.name.localeCompare(a.name, 'ar') : a.name.localeCompare(b.name, 'ar'));
  }, [services, query, category, sort]);

  function clear() { setCategory('all'); setQuery(''); setSort('name'); }

  return <div className={styles.page}>
    <header className={styles.top}>
      <div className={styles.wrap}>
        <div className={styles.topInner}>
          <Link href="/services" className={styles.brand}><strong>ASLAN</strong> SERVICES</Link>
          <form role="search" className={styles.search} action="/services">
            <input type="search" name="q" defaultValue={initialQuery} maxLength={120}
              placeholder={copy.placeholder} aria-label={copy.search} />
            <button type="submit"><Search size={17} style={{display:'inline',verticalAlign:'middle'}} aria-hidden="true"/> {copy.submit}</button>
          </form>
          <nav className={styles.links} aria-label={copy.nav}>
            <Link href="/service-requests"><ClipboardList size={18} aria-hidden="true"/> {copy.requests}</Link>
            <Link href="/support">{copy.help}</Link>
          </nav>
        </div>
      </div>
    </header>

    <div className={styles.wrap}>
      <section className={styles.hero} aria-label={copy.heroAria}>
        <div className={styles.heroMain}>
          <span className={styles.eyebrow}>{copy.eyebrow}</span>
          <h1>{copy.hero}</h1>
          <p>{copy.intro}</p>
          <div className={styles.actions}>
            <a className={styles.primary} href="#catalog">{copy.explore}</a>
            <Link className={styles.secondary} href="/service-requests">{copy.request}</Link>
          </div>
        </div>
        <aside className={styles.heroSide}>
          <CalendarDays size={38} aria-hidden="true"/>
          <h2>{copy.asideTitle}</h2>
          <p>{copy.asideDescription}</p>
          <div className={styles.actions}><Link className={styles.primary} href="/service-requests">{copy.asideAction}</Link></div>
        </aside>
      </section>

      <section className={styles.section} aria-labelledby="categories-heading">
        <div className={styles.heading}><div>
          <h2 id="categories-heading">{copy.categoriesTitle}</h2>
          <p>{copy.categoriesDescription}</p>
        </div><a href="#catalog">جميع الخدمات ←</a></div>
        <div className={styles.categoryGrid}>
          {serviceCategories.filter(item => item.id !== 'other').map(item => {
            const Icon = iconsByCategory[item.id];
            const count = item.id === 'all' ? services.length : services.filter(x => serviceCategory(x) === item.id).length;
            return <button type="button" key={item.id} className={styles.category} aria-pressed={category === item.id}
              onClick={() => { setCategory(item.id); document.getElementById('catalog')?.scrollIntoView({behavior:'smooth'}); }}>
              <Icon size={30} aria-hidden="true"/>
              <span>{item.label}</span>
              <small>{count} خدمة</small>
            </button>;
          })}
        </div>
      </section>

      <section id="catalog" className={styles.section} aria-labelledby="catalog-heading">
        <div className={styles.heading}><div><h2 id="catalog-heading">{copy.catalogTitle}</h2>
          <p>{copy.catalogDescription}</p></div>
          <button type="button" className={styles.filterToggle} aria-expanded={showFilters} onClick={() => setShowFilters(v => !v)}>
            <SlidersHorizontal size={17} aria-hidden="true"/> الفلاتر
          </button>
        </div>
        <div className={styles.catalog}>
          <aside className={styles.filters + (showFilters ? ' ' + styles.show : '')} aria-label="فلاتر الخدمات">
            <h3>ابحث عن الخدمة المناسبة</h3>
            <label>اسم أو وصف الخدمة
              <input type="search" value={query} onChange={e => setQuery(e.target.value.slice(0,120))} placeholder="كهرباء، تنجيد، ري..."/>
            </label>
            <label>المجال
              <select value={category} onChange={e => setCategory(e.target.value as ServiceCategory)}>
                {serviceCategories.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
            </label>
            <button type="button" className={styles.secondary} onClick={clear}>مسح الفلاتر</button>
            <p style={{fontSize:12,color:'#65747f'}}>سعر ومدة كل خدمة يحدَّدان بعد دراسة الطلب؛ لا نعرض أسعارًا تقديرية غير معتمدة.</p>
          </aside>
          <div>
            <div className={styles.resultBar}>
              <p role="status" aria-live="polite">{results.length} خدمة مطابقة</p>
              <label>الترتيب <select value={sort} onChange={e => setSort(e.target.value)}>
                <option value="name">الاسم: تصاعديًا</option><option value="name-reverse">الاسم: تنازليًا</option>
              </select></label>
            </div>
            {(query || category !== 'all') && <div className={styles.chips}>
              {query && <button type="button" onClick={() => setQuery('')}>البحث: {query} ×</button>}
              {category !== 'all' && <button type="button" onClick={() => setCategory('all')}>المجال: {categoryLabel(category)} ×</button>}
              <button type="button" onClick={clear}>عرض الكل</button>
            </div>}
            {error ? <div className={styles.empty} role="alert"><h3>تعذر تحميل الخدمات</h3>
              <p>حدث خطأ أثناء الاتصال بكتالوج الخدمات. أعد المحاولة أو تواصل مع الدعم.</p><Link href="/support">مركز الدعم</Link></div>
              : results.length ? <div className={styles.grid}>{results.map(service => {
                const Icon = iconsBySlug[service.slug] ?? iconsByCategory[serviceCategory(service)];
                return <article className={styles.card} key={service.id}>
                  <div className={styles.visual}><Icon aria-hidden="true"/><small>خدمات ASLAN</small></div>
                  <div className={styles.cardBody}>
                    <span className={styles.tag}>{categoryLabel(serviceCategory(service))}</span>
                    <h3>{service.name}</h3><p>{service.description}</p>
                    <div className={styles.cardLinks}>
                      <Link href={'/services/' + encodeURIComponent(service.slug)}>تفاصيل الخدمة ←</Link>
                      <Link href={serviceRequestUrl(service.slug)}>اطلب الخدمة</Link>
                    </div>
                  </div>
                </article>;
              })}</div> : <div className={styles.empty}><h3>لا توجد خدمات مطابقة</h3>
                <p>جرّب تغيير المجال أو كلمة البحث.</p><button className={styles.secondary} onClick={clear}>عرض كل الخدمات</button></div>}
          </div>
        </div>
      </section>

      <section className={styles.trust} aria-label="خطوات الحصول على الخدمة">
        <article><ClipboardList size={24} aria-hidden="true"/><div><strong>طلب منظّم</strong><p>أرسل وصفًا واضحًا لاحتياجك.</p></div></article>
        <article><CheckCircle2 size={24} aria-hidden="true"/><div><strong>عرض للموافقة</strong><p>راجع المبلغ والتفاصيل قبل القبول.</p></div></article>
        <article><MapPin size={24} aria-hidden="true"/><div><strong>جدولة ومتابعة</strong><p>تابع موعد التنفيذ وحالة الطلب من حسابك.</p></div></article>
      </section>
    </div>
  </div>;
}
