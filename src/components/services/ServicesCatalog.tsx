'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
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
              placeholder="ابحث عن الكهرباء أو التنجيد أو التكييف..." aria-label="ابحث عن خدمة" />
            <button type="submit"><Search size={17} style={{display:'inline',verticalAlign:'middle'}} aria-hidden="true"/> بحث</button>
          </form>
          <nav className={styles.links} aria-label="روابط الخدمات">
            <Link href="/service-requests"><ClipboardList size={18} aria-hidden="true"/> طلباتي</Link>
            <Link href="/support">المساعدة</Link>
          </nav>
        </div>
      </div>
    </header>

    <div className={styles.wrap}>
      <section className={styles.hero} aria-label="اكتشف خدمات ASLAN">
        <div className={styles.heroMain}>
          <span className={styles.eyebrow}>ASLAN SERVICES · حلول مهنية لمشاريعك</span>
          <h1>خدمات احترافية.<br/>من الطلب إلى الإنجاز.</h1>
          <p>اكتشف خدمات المؤسسة المهنية، حدّد احتياجك، واطلب دراسة وعرض سعر قبل الاتفاق على نطاق العمل والمواعيد.</p>
          <div className={styles.actions}>
            <a className={styles.primary} href="#catalog">استكشف الخدمات</a>
            <Link className={styles.secondary} href="/service-requests">تقديم طلب خدمة</Link>
          </div>
        </div>
        <aside className={styles.heroSide}>
          <CalendarDays size={38} aria-hidden="true"/>
          <h2>مشروعك يبدأ بطلب واضح</h2>
          <p>أرسل وصف العمل والوقت المفضل. تراجع الإدارة التفاصيل وتصدر عرض السعر، ثم يتم الاتفاق على موعد التنفيذ.</p>
          <div className={styles.actions}><Link className={styles.primary} href="/service-requests">اطلب عرضًا للخدمة ←</Link></div>
        </aside>
      </section>

      <section className={styles.section} aria-labelledby="categories-heading">
        <div className={styles.heading}><div>
          <h2 id="categories-heading">تصفح حسب المجال</h2>
          <p>تعرّف على اختصاصات ASLAN، دون خلط الخدمات بسوق المنتجات.</p>
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
        <div className={styles.heading}><div><h2 id="catalog-heading">دليل خدمات ASLAN</h2>
          <p>الخدمات المفعّلة والمعتمدة في كتالوج المؤسسة.</p></div>
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
