'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {useAslanLanguage} from '@/components/AslanLocale';
import {localizedText,normalizeSearchText} from '@/lib/i18n/content';
import type {AslanLocale} from '@/lib/i18n/core';
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
  serviceCategories, serviceCategory, serviceRequestUrl,
  type AslanService, type ServiceCategory,
} from '@/lib/services/catalog';
import styles from './Services.module.css';

const catalogCopy = {
  "ar": {
    "allServices": "جميع الخدمات",
    "unit": "خدمة",
    "filters": "الفلاتر",
    "filtersAria": "فلاتر الخدمات",
    "find": "ابحث عن الخدمة المناسبة",
    "nameDescription": "اسم أو وصف الخدمة",
    "placeholder": "كهرباء، تنجيد، ري...",
    "field": "المجال",
    "clear": "مسح الفلاتر",
    "pricing": "يُحدّد سعر ومدة الخدمة بعد دراسة الطلب.",
    "matching": "خدمة مطابقة",
    "sort": "الترتيب",
    "asc": "الاسم: تصاعديًا",
    "desc": "الاسم: تنازليًا",
    "searchChip": "البحث",
    "showAll": "عرض الكل",
    "showAllServices": "عرض كل الخدمات",
    "errorTitle": "تعذر تحميل الخدمات",
    "errorDetail": "حدث خطأ أثناء الاتصال بكتالوج الخدمات.",
    "support": "مركز الدعم",
    "badge": "خدمات ASLAN",
    "details": "تفاصيل الخدمة",
    "request": "اطلب الخدمة",
    "noMatches": "لا توجد خدمات مطابقة",
    "noMatchesDetail": "{ui.noMatchesDetail}",
    "steps": "خطوات الحصول على الخدمة",
    "step1": "طلب منظّم",
    "step1Desc": "أرسل وصفًا واضحًا لاحتياجك.",
    "step2": "عرض للموافقة",
    "step2Desc": "راجع المبلغ والتفاصيل قبل القبول.",
    "step3": "جدولة ومتابعة",
    "step3Desc": "تابع موعد التنفيذ وحالة الطلب من حسابك."
  },
  "en": {
    "allServices": "All services",
    "unit": "services",
    "filters": "Filters",
    "filtersAria": "Service filters",
    "find": "Find the right service",
    "nameDescription": "Service name or description",
    "placeholder": "Electrical, upholstery, irrigation...",
    "field": "Category",
    "clear": "Clear filters",
    "pricing": "Price and duration are determined after reviewing the request.",
    "matching": "matching services",
    "sort": "Sort by",
    "asc": "Name: A–Z",
    "desc": "Name: Z–A",
    "searchChip": "Search",
    "showAll": "Show all",
    "showAllServices": "Show all services",
    "errorTitle": "Unable to load services",
    "errorDetail": "An error occurred while loading services.",
    "support": "Support center",
    "badge": "ASLAN services",
    "details": "Service details",
    "request": "Request service",
    "noMatches": "No matching services",
    "noMatchesDetail": "Try another category or search term.",
    "steps": "How to request a service",
    "step1": "Submit a request",
    "step1Desc": "Describe your requirements.",
    "step2": "Review the quote",
    "step2Desc": "Review the price and details before approval.",
    "step3": "Schedule and track",
    "step3Desc": "Track the appointment and request status."
  },
  "fr": {
    "allServices": "Tous les services",
    "unit": "services",
    "filters": "Filtres",
    "filtersAria": "Filtres des services",
    "find": "Trouver le bon service",
    "nameDescription": "Nom ou description",
    "placeholder": "Électricité, tapisserie, irrigation...",
    "field": "Catégorie",
    "clear": "Effacer les filtres",
    "pricing": "Prix et délai définis après examen de la demande.",
    "matching": "services correspondants",
    "sort": "Trier par",
    "asc": "Nom : A–Z",
    "desc": "Nom : Z–A",
    "searchChip": "Recherche",
    "showAll": "Tout afficher",
    "showAllServices": "Voir tous les services",
    "errorTitle": "Impossible de charger les services",
    "errorDetail": "Erreur lors du chargement des services.",
    "support": "Centre d’assistance",
    "badge": "Services ASLAN",
    "details": "Détails du service",
    "request": "Demander le service",
    "noMatches": "Aucun service correspondant",
    "noMatchesDetail": "Essayez une autre catégorie ou recherche.",
    "steps": "Comment demander un service",
    "step1": "Envoyer une demande",
    "step1Desc": "Décrivez vos besoins.",
    "step2": "Examiner le devis",
    "step2Desc": "Vérifiez le prix et les détails.",
    "step3": "Planifier et suivre",
    "step3Desc": "Suivez la date et le statut de la demande."
  },
  "es": {
    "allServices": "Todos los servicios",
    "unit": "servicios",
    "filters": "Filtros",
    "filtersAria": "Filtros de servicios",
    "find": "Encuentra el servicio adecuado",
    "nameDescription": "Nombre o descripción",
    "placeholder": "Electricidad, tapicería, riego...",
    "field": "Categoría",
    "clear": "Borrar filtros",
    "pricing": "El precio y el plazo se definen tras revisar la solicitud.",
    "matching": "servicios coincidentes",
    "sort": "Ordenar por",
    "asc": "Nombre: A–Z",
    "desc": "Nombre: Z–A",
    "searchChip": "Búsqueda",
    "showAll": "Mostrar todo",
    "showAllServices": "Ver todos los servicios",
    "errorTitle": "No se pueden cargar los servicios",
    "errorDetail": "Error al cargar los servicios.",
    "support": "Centro de ayuda",
    "badge": "Servicios ASLAN",
    "details": "Detalles del servicio",
    "request": "Solicitar servicio",
    "noMatches": "No hay servicios coincidentes",
    "noMatchesDetail": "Prueba otra categoría o búsqueda.",
    "steps": "Cómo solicitar un servicio",
    "step1": "Enviar solicitud",
    "step1Desc": "Describe tus necesidades.",
    "step2": "Revisar presupuesto",
    "step2Desc": "Revisa el precio y los detalles.",
    "step3": "Programar y seguir",
    "step3Desc": "Consulta la fecha y el estado de la solicitud."
  },
  "de": {
    "allServices": "Alle Dienstleistungen",
    "unit": "Dienstleistungen",
    "filters": "Filter",
    "filtersAria": "Dienstleistungsfilter",
    "find": "Passende Dienstleistung finden",
    "nameDescription": "Name oder Beschreibung",
    "placeholder": "Elektrik, Polsterei, Bewässerung...",
    "field": "Kategorie",
    "clear": "Filter zurücksetzen",
    "pricing": "Preis und Dauer werden nach Prüfung der Anfrage festgelegt.",
    "matching": "passende Dienstleistungen",
    "sort": "Sortieren nach",
    "asc": "Name: A–Z",
    "desc": "Name: Z–A",
    "searchChip": "Suche",
    "showAll": "Alle anzeigen",
    "showAllServices": "Alle Dienstleistungen anzeigen",
    "errorTitle": "Dienstleistungen konnten nicht geladen werden",
    "errorDetail": "Fehler beim Laden der Dienstleistungen.",
    "support": "Hilfezentrum",
    "badge": "ASLAN Dienstleistungen",
    "details": "Details zur Dienstleistung",
    "request": "Dienstleistung anfragen",
    "noMatches": "Keine passenden Dienstleistungen",
    "noMatchesDetail": "Versuchen Sie eine andere Kategorie oder Suche.",
    "steps": "So funktioniert die Anfrage",
    "step1": "Anfrage senden",
    "step1Desc": "Beschreiben Sie Ihre Anforderungen.",
    "step2": "Angebot prüfen",
    "step2Desc": "Prüfen Sie Preis und Einzelheiten.",
    "step3": "Planen und verfolgen",
    "step3Desc": "Verfolgen Sie Termin und Status."
  },
  "pt": {
    "allServices": "Todos os serviços",
    "unit": "serviços",
    "filters": "Filtros",
    "filtersAria": "Filtros de serviços",
    "find": "Encontre o serviço adequado",
    "nameDescription": "Nome ou descrição",
    "placeholder": "Eletricidade, estofamento, irrigação...",
    "field": "Categoria",
    "clear": "Limpar filtros",
    "pricing": "O preço e o prazo são definidos após análise do pedido.",
    "matching": "serviços correspondentes",
    "sort": "Ordenar por",
    "asc": "Nome: A–Z",
    "desc": "Nome: Z–A",
    "searchChip": "Pesquisa",
    "showAll": "Mostrar tudo",
    "showAllServices": "Ver todos os serviços",
    "errorTitle": "Não foi possível carregar os serviços",
    "errorDetail": "Ocorreu um erro ao carregar os serviços.",
    "support": "Centro de apoio",
    "badge": "Serviços ASLAN",
    "details": "Detalhes do serviço",
    "request": "Solicitar serviço",
    "noMatches": "Nenhum serviço correspondente",
    "noMatchesDetail": "Experimente outra categoria ou pesquisa.",
    "steps": "Como solicitar um serviço",
    "step1": "Enviar pedido",
    "step1Desc": "Descreva as suas necessidades.",
    "step2": "Rever orçamento",
    "step2Desc": "Reveja o preço e os detalhes.",
    "step3": "Agendar e acompanhar",
    "step3Desc": "Acompanhe a data e o estado do pedido."
  }
} satisfies Record<AslanLocale,Record<string,string>>;
const categoryCopy = {
  "ar": {
    "all": "كل الخدمات",
    "craft": "التنجيد والخياطة",
    "electrical": "الكهرباء والورشات",
    "climate": "التبريد والتكييف",
    "water": "المياه والتدفئة والري",
    "other": "خدمات إضافية"
  },
  "en": {
    "all": "All services",
    "craft": "Upholstery and tailoring",
    "electrical": "Electrical and workshops",
    "climate": "Cooling and air conditioning",
    "water": "Water, heating and irrigation",
    "other": "Other services"
  },
  "fr": {
    "all": "Tous les services",
    "craft": "Tapisserie et couture",
    "electrical": "Électricité et ateliers",
    "climate": "Froid et climatisation",
    "water": "Eau, chauffage et irrigation",
    "other": "Autres services"
  },
  "es": {
    "all": "Todos los servicios",
    "craft": "Tapicería y costura",
    "electrical": "Electricidad y talleres",
    "climate": "Refrigeración y climatización",
    "water": "Agua, calefacción y riego",
    "other": "Otros servicios"
  },
  "de": {
    "all": "Alle Dienstleistungen",
    "craft": "Polsterei und Schneiderei",
    "electrical": "Elektrik und Werkstätten",
    "climate": "Kühlung und Klimaanlagen",
    "water": "Wasser, Heizung und Bewässerung",
    "other": "Weitere Dienstleistungen"
  },
  "pt": {
    "all": "Todos os serviços",
    "craft": "Estofamento e costura",
    "electrical": "Eletricidade e oficinas",
    "climate": "Refrigeração e ar-condicionado",
    "water": "Água, aquecimento e irrigação",
    "other": "Outros serviços"
  }
} satisfies Record<AslanLocale,Record<ServiceCategory,string>>;
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
  const {language}=useAslanLanguage();const copy=serviceCopy[language];const ui=catalogCopy[language];const categoryNames=categoryCopy[language];
  const initial = serviceCategories.some(item => item.id === initialCategory) ? initialCategory as ServiceCategory : 'all';
  const [category, setCategory] = useState<ServiceCategory>(initial);
  const [query, setQuery] = useState(initialQuery.slice(0, 120));
  const [sort, setSort] = useState('name');
  const [showFilters, setShowFilters] = useState(false);
  const results = useMemo(() => {
    const needle = normalizeSearchText(query);
    const nameOf = (s: AslanService) => localizedText(s.nameTranslations, language, s.name);
    const descriptionOf = (s: AslanService) => localizedText(s.descriptionTranslations, language, s.description);
    const collator = new Intl.Collator(language, {sensitivity:'base', numeric:true});
    return services.filter(service =>
      (category === 'all' || serviceCategory(service) === category) &&
      (!needle || normalizeSearchText(nameOf(service) + ' ' + descriptionOf(service)).includes(needle))
    ).sort((a,b) => (sort === 'name-reverse' ? -1 : 1) * collator.compare(nameOf(a),nameOf(b)));
  }, [services, language, query, category, sort]);

  function clear() { setCategory('all'); setQuery(''); setSort('name'); }

  return <div className={styles.page}>
    <header className={styles.top}>
      <div className={styles.wrap}>
        <div className={styles.topInner}>
          <Link href={`/${language}/services`} className={styles.brand}><strong>ASLAN</strong> SERVICES</Link>
          <form role="search" className={styles.search} action={`/${language}/services`}>
            <input type="search" name="q" defaultValue={initialQuery} maxLength={120}
              placeholder={copy.placeholder} aria-label={copy.search} />
            <button type="submit"><Search size={17} style={{display:'inline',verticalAlign:'middle'}} aria-hidden="true"/> {copy.submit}</button>
          </form>
          <nav className={styles.links} aria-label={copy.nav}>
            <Link href={`/${language}/service-requests`}><ClipboardList size={18} aria-hidden="true"/> {copy.requests}</Link>
            <Link href={`/${language}/support`}>{copy.help}</Link>
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
            <Link className={styles.secondary} href={`/${language}/service-requests`}>{copy.request}</Link>
          </div>
        </div>
        <aside className={styles.heroSide}>
          <CalendarDays size={38} aria-hidden="true"/>
          <h2>{copy.asideTitle}</h2>
          <p>{copy.asideDescription}</p>
          <div className={styles.actions}><Link className={styles.primary} href={`/${language}/service-requests`}>{copy.asideAction}</Link></div>
        </aside>
      </section>

      <section className={styles.section} aria-labelledby="categories-heading">
        <div className={styles.heading}><div>
          <h2 id="categories-heading">{copy.categoriesTitle}</h2>
          <p>{copy.categoriesDescription}</p>
        </div><a href="#catalog">{ui.allServices} ←</a></div>
        <div className={styles.categoryGrid}>
          {serviceCategories.filter(item => item.id !== 'other').map(item => {
            const Icon = iconsByCategory[item.id];
            const count = item.id === 'all' ? services.length : services.filter(x => serviceCategory(x) === item.id).length;
            return <button type="button" key={item.id} className={styles.category} aria-pressed={category === item.id}
              onClick={() => { setCategory(item.id); document.getElementById('catalog')?.scrollIntoView({behavior:'smooth'}); }}>
              <Icon size={30} aria-hidden="true"/>
              <span>{categoryNames[item.id]}</span>
              <small>{count} {ui.unit}</small>
            </button>;
          })}
        </div>
      </section>

      <section id="catalog" className={styles.section} aria-labelledby="catalog-heading">
        <div className={styles.heading}><div><h2 id="catalog-heading">{copy.catalogTitle}</h2>
          <p>{copy.catalogDescription}</p></div>
          <button type="button" className={styles.filterToggle} aria-expanded={showFilters} onClick={() => setShowFilters(v => !v)}>
            <SlidersHorizontal size={17} aria-hidden="true"/> {ui.filters}
          </button>
        </div>
        <div className={styles.catalog}>
          <aside className={styles.filters + (showFilters ? ' ' + styles.show : '')} aria-label={ui.filtersAria}>
            <h3>{ui.find}</h3>
            <label>{ui.nameDescription}
              <input type="search" value={query} onChange={e => setQuery(e.target.value.slice(0,120))} placeholder={ui.placeholder}/>
            </label>
            <label>{ui.field}
              <select value={category} onChange={e => setCategory(e.target.value as ServiceCategory)}>
                {serviceCategories.map(item => <option key={item.id} value={item.id}>{categoryNames[item.id]}</option>)}
              </select>
            </label>
            <button type="button" className={styles.secondary} onClick={clear}>{ui.clear}</button>
            <p style={{fontSize:12,color:'#65747f'}}>{ui.pricing}</p>
          </aside>
          <div>
            <div className={styles.resultBar}>
              <p role="status" aria-live="polite">{results.length} {ui.matching}</p>
              <label>{ui.sort} <select value={sort} onChange={e => setSort(e.target.value)}>
                <option value="name">{ui.asc}</option><option value="name-reverse">{ui.desc}</option>
              </select></label>
            </div>
            {(query || category !== 'all') && <div className={styles.chips}>
              {query && <button type="button" onClick={() => setQuery('')}>{ui.searchChip}: {query} ×</button>}
              {category !== 'all' && <button type="button" onClick={() => setCategory('all')}>{ui.field}: {categoryNames[category]} ×</button>}
              <button type="button" onClick={clear}>{ui.showAll}</button>
            </div>}
            {error ? <div className={styles.empty} role="alert"><h3>{ui.errorTitle}</h3>
              <p>{ui.errorDetail}</p><Link href={`/${language}/support`}>{ui.support}</Link></div>
              : results.length ? <div className={styles.grid}>{results.map(service => {
                const Icon = iconsBySlug[service.slug] ?? iconsByCategory[serviceCategory(service)];
                return <article className={styles.card} key={service.id}>
                  <div className={styles.visual}><Icon aria-hidden="true"/><small>{ui.badge}</small></div>
                  <div className={styles.cardBody}>
                    <span className={styles.tag}>{categoryNames[serviceCategory(service)]}</span>
                    <h3>{localizedText(service.nameTranslations,language,service.name)}</h3><p>{localizedText(service.descriptionTranslations,language,service.description)}</p>
                    <div className={styles.cardLinks}>
                      <Link href={'/' + language + '/services/' + encodeURIComponent(service.slug)}>{ui.details} ←</Link>
                      <Link href={'/' + language + serviceRequestUrl(service.slug)}>{ui.request}</Link>
                    </div>
                  </div>
                </article>;
              })}</div> : <div className={styles.empty}><h3>{ui.noMatches}</h3>
                <p>جرّب تغيير المجال أو كلمة البحث.</p><button className={styles.secondary} onClick={clear}>{ui.showAllServices}</button></div>}
          </div>
        </div>
      </section>

      <section className={styles.trust} aria-label={ui.steps}>
        <article><ClipboardList size={24} aria-hidden="true"/><div><strong>{ui.step1}</strong><p>{ui.step1Desc}</p></div></article>
        <article><CheckCircle2 size={24} aria-hidden="true"/><div><strong>{ui.step2}</strong><p>{ui.step2Desc}</p></div></article>
        <article><MapPin size={24} aria-hidden="true"/><div><strong>{ui.step3}</strong><p>{ui.step3Desc}</p></div></article>
      </section>
    </div>
  </div>;
}
