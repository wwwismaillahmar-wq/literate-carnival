import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type CourseRow = Record<string, unknown> & { id?: string | number };

function textField(row: CourseRow, keys: string[], fallback = ''): string {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number') return String(value);
  }
  return fallback;
}

function isPublished(row: CourseRow): boolean {
  if (typeof row.published === 'boolean') return row.published;
  if (typeof row.is_published === 'boolean') return row.is_published;
  if (typeof row.is_active === 'boolean') return row.is_active;
  if (typeof row.visibility === 'string') return ['published', 'public'].includes(row.visibility.toLowerCase());
  if (typeof row.active === 'boolean') return row.active;
  if (typeof row.status === 'string') return ['published', 'active', 'public'].includes(row.status.toLowerCase());
  return false;
}

export default async function Academy() {
  const db = await createClient();
  const { data, error } = await db.from('courses').select('*').limit(100);
  const courses = ((data ?? []) as CourseRow[])
    .filter(isPublished)
    .sort((a, b) => textField(a, ['title', 'name', 'course_name']).localeCompare(textField(b, ['title', 'name', 'course_name']), 'ar'));

  return (
    <main className="section">
      <div className="wrap">
        <span className="kicker">ACADEMY / M33</span>
        <h1>الأكاديمية</h1>
        <p className="muted">تكوين مهني عملي يربط المعرفة بالتطبيق والنتائج القابلة للإثبات.</p>

        {error ? (
          <section className="card" role="alert" style={{ marginTop: 24, border: '1px solid #c53030' }}>
            <h2>تعذر تحميل كتالوج الدورات</h2>
            <p className="muted">لم نعرض بيانات افتراضية على أنها دورات منشورة. يمكن إرسال طلب اهتمام إلى الفريق حتى تُراجع مشكلة قراءة الكتالوج.</p>
            <Link className="btn primary" href="/contact?type=دورة%20تكوينية">طلب معلومات عن التكوين</Link>
          </section>
        ) : courses.length ? (
          <section className="grid three" aria-label="الدورات المنشورة" style={{ marginTop: 24 }}>
            {courses.map((course, index) => {
              const id = String(course.id ?? index);
              const title = textField(course, ['title', 'name', 'course_name'], 'دورة تكوينية');
              const description = textField(course, ['description', 'summary', 'details'], 'تفاصيل البرنامج متاحة عند التواصل مع فريق الأكاديمية.');
              const price = textField(course, ['price_dzd', 'price', 'fee']);
              const duration = textField(course, ['duration', 'duration_label']);
              return (
                <article className="card" key={id}>
                  <span className="kicker">COURSE</span>
                  <h2>{title}</h2>
                  <p className="muted">{description}</p>
                  {duration && <p>المدة: {duration}</p>}
                  {price && <p>السعر: {price} دج</p>}
                  <Link className="btn primary" href={'/academy/' + encodeURIComponent(id)}>
                    عرض البرنامج والدروس
                  </Link>
                </article>
              );
            })}
          </section>
        ) : (
          <section className="card" style={{ marginTop: 24 }}>
            <h2>لا توجد دورات منشورة حاليًا</h2>
            <p className="muted">لا توجد سجلات منشورة في قاعدة البيانات، لذلك لا نعرض بطاقات وهمية. يمكنك إرسال طلب اهتمام لمعرفة البرامج القادمة.</p>
            <Link className="btn primary" href="/contact?type=دورة%20تكوينية">طلب معلومات عن التكوين</Link>
          </section>
        )}

        <section className="card" style={{ marginTop: 24 }}>
          <h2>مجالات التكوين</h2>
          <p className="muted">التنجيد والديكور، الكهرباء الصناعية، التبريد والتكييف، التدفئة والأنابيب. ظهور أي برنامج بوصفه دورة منشورة يتطلب وجود سجل فعلي في الكتالوج.</p>
        </section>
      </div>
    </main>
  );
}
