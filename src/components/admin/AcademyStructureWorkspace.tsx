'use client';

import { useCallback, useEffect, useState } from 'react';

type School = { id: string; slug: string; name: string; description: string; default_language: string; supported_languages: string[]; status: string };
type Branch = { id: string; school_id: string; slug: string; name: string; address: string; timezone: string; language: string; status: string };
type Course = { id: string; title: string; status: string };
type Offering = { id: string; school_id: string; branch_id: string | null; course_id: string; language: string; status: string; capacity: number | null; starts_at: string | null; ends_at: string | null };

const languages = [
  { value: 'ar', label: 'العربية' }, { value: 'fr', label: 'الفرنسية' },
  { value: 'en', label: 'الإنجليزية' }, { value: 'es', label: 'الإسبانية' },
  { value: 'de', label: 'الألمانية' }, { value: 'it', label: 'الإيطالية' },
];

async function readJson<T>(response: Response): Promise<T> {
  const result = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(result.error || 'تعذر تنفيذ العملية.');
  return result;
}

export function AcademyStructureWorkspace() {
  const [schools, setSchools] = useState<School[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [offerings, setOfferings] = useState<Offering[]>([]);
  const [schoolName, setSchoolName] = useState('');
  const [schoolSlug, setSchoolSlug] = useState('');
  const [schoolDescription, setSchoolDescription] = useState('');
  const [defaultLanguage, setDefaultLanguage] = useState('ar');
  const [branchSchool, setBranchSchool] = useState('');
  const [branchName, setBranchName] = useState('');
  const [branchSlug, setBranchSlug] = useState('');
  const [branchAddress, setBranchAddress] = useState('');
  const [branchLanguage, setBranchLanguage] = useState('ar');
  const [offeringSchool, setOfferingSchool] = useState('');
  const [offeringBranch, setOfferingBranch] = useState('');
  const [offeringCourse, setOfferingCourse] = useState('');
  const [offeringLanguage, setOfferingLanguage] = useState('ar');
  const [offeringCapacity, setOfferingCapacity] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const data = await readJson<{ schools: School[]; branches: Branch[]; courses: Course[]; offerings: Offering[] }>(
      await fetch('/api/admin/academy/structure', { cache: 'no-store' }),
    );
    setSchools(data.schools); setBranches(data.branches); setCourses(data.courses); setOfferings(data.offerings);
    setBranchSchool(current => data.schools.some(s => s.id === current) ? current : data.schools[0]?.id || '');
    setOfferingSchool(current => data.schools.some(s => s.id === current) ? current : data.schools[0]?.id || '');
    setOfferingCourse(current => data.courses.some(c => c.id === current) ? current : data.courses[0]?.id || '');
  }, []);

  useEffect(() => { void load().catch(cause => setError(cause instanceof Error ? cause.message : 'تعذر تحميل بنية الأكاديمية.')); }, [load]);

  async function mutate(path: string, method: 'POST' | 'PATCH', body: Record<string, unknown>, success: string) {
    if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await readJson(await fetch(path, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }));
      await load();
      setNotice(success);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر حفظ التغيير.');
    } finally { setBusy(false); }
  }

  async function submitSchool(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await mutate('/api/admin/academy/structure', 'POST', {
      action: 'create_school', name: schoolName, slug: schoolSlug, description: schoolDescription,
      defaultLanguage, supportedLanguages: languages.map(item => item.value),
    }, 'تم حفظ المدرسة في قاعدة البيانات.');
    setSchoolName(''); setSchoolSlug(''); setSchoolDescription('');
  }

  async function submitBranch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await mutate('/api/admin/academy/structure', 'POST', {
      action: 'create_branch', schoolId: branchSchool, name: branchName, slug: branchSlug,
      address: branchAddress, language: branchLanguage, timezone: 'Africa/Algiers',
    }, 'تم حفظ الفرع في قاعدة البيانات.');
    setBranchName(''); setBranchSlug(''); setBranchAddress('');
  }

  async function submitOffering(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await mutate('/api/admin/academy/structure', 'POST', {
      action: 'create_offering', schoolId: offeringSchool, branchId: offeringBranch,
      courseId: offeringCourse, language: offeringLanguage, capacity: offeringCapacity,
    }, 'تم حفظ العرض التعليمي كمسودة.');
  }

  const schoolNameById = new Map(schools.map(school => [school.id, school.name]));
  const branchNameById = new Map(branches.map(branch => [branch.id, branch.name]));
  const courseNameById = new Map(courses.map(course => [course.id, course.title]));

  return <section className="admin-workspace" style={{ marginTop: 24 }}>
    <h2>المدارس والفروع والعروض التعليمية</h2>
    <p className="muted">إدارة متعددة المدارس والفروع مع إعداد لغة المدرسة ولغة كل عرض. العروض الجديدة تُحفظ كمسودات، ولا تظهر للمتعلمين حتى تفعيل المدرسة والفرع ونشر العرض.</p>
    {error && <p role="alert" className="form-error">{error}</p>}
    {notice && <p role="status" className="form-success">{notice}</p>}

    <div className="admin-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 20 }}>
      <form onSubmit={submitSchool} className="admin-panel" style={{ display: 'grid', gap: 10 }}>
        <h3>إنشاء مدرسة</h3>
        <label>اسم المدرسة<input required minLength={2} maxLength={180} value={schoolName} onChange={e => setSchoolName(e.target.value)} /></label>
        <label>الرابط المختصر<input required pattern="[a-z0-9]+(-[a-z0-9]+)*" value={schoolSlug} onChange={e => setSchoolSlug(e.target.value)} placeholder="aslan-school" /></label>
        <label>الوصف<textarea maxLength={5000} value={schoolDescription} onChange={e => setSchoolDescription(e.target.value)} /></label>
        <label>اللغة الافتراضية<select value={defaultLanguage} onChange={e => setDefaultLanguage(e.target.value)}>{languages.map(lang => <option key={lang.value} value={lang.value}>{lang.label}</option>)}</select></label>
        <p className="muted">اللغات المدعومة: العربية، الفرنسية، الإنجليزية، الإسبانية، الألمانية، الإيطالية.</p>
        <button disabled={busy || !schoolName.trim() || !schoolSlug.trim()} type="submit">{busy ? 'جارٍ الحفظ…' : 'إنشاء المدرسة'}</button>
      </form>

      <form onSubmit={submitBranch} className="admin-panel" style={{ display: 'grid', gap: 10 }}>
        <h3>إنشاء فرع</h3>
        <label>المدرسة<select required value={branchSchool} onChange={e => setBranchSchool(e.target.value)}><option value="">اختر مدرسة</option>{schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
        <label>اسم الفرع<input required minLength={2} maxLength={180} value={branchName} onChange={e => setBranchName(e.target.value)} /></label>
        <label>الرابط المختصر<input required pattern="[a-z0-9]+(-[a-z0-9]+)*" value={branchSlug} onChange={e => setBranchSlug(e.target.value)} placeholder="batna-branch" /></label>
        <label>العنوان<input maxLength={1000} value={branchAddress} onChange={e => setBranchAddress(e.target.value)} /></label>
        <label>لغة الفرع<select value={branchLanguage} onChange={e => setBranchLanguage(e.target.value)}>{languages.map(lang => <option key={lang.value} value={lang.value}>{lang.label}</option>)}</select></label>
        <button disabled={busy || !branchSchool || !branchName.trim() || !branchSlug.trim()} type="submit">إنشاء الفرع كمسودة</button>
      </form>

      <form onSubmit={submitOffering} className="admin-panel" style={{ display: 'grid', gap: 10 }}>
        <h3>إسناد دورة إلى مدرسة/فرع</h3>
        <label>المدرسة<select required value={offeringSchool} onChange={e => { setOfferingSchool(e.target.value); setOfferingBranch(''); }}><option value="">اختر مدرسة</option>{schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
        <label>الفرع<select value={offeringBranch} onChange={e => setOfferingBranch(e.target.value)}><option value="">عرض على مستوى المدرسة</option>{branches.filter(b => b.school_id === offeringSchool).map(b => <option key={b.id} value={b.id}>{b.name} — {b.language}</option>)}</select></label>
        <label>الدورة الأصلية<select required value={offeringCourse} onChange={e => setOfferingCourse(e.target.value)}><option value="">اختر دورة</option>{courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select></label>
        <label>لغة العرض<select value={offeringLanguage} onChange={e => setOfferingLanguage(e.target.value)}>{languages.map(lang => <option key={lang.value} value={lang.value}>{lang.label}</option>)}</select></label>
        <label>الطاقة الاستيعابية (اختياري)<input type="number" min={1} max={1000000} value={offeringCapacity} onChange={e => setOfferingCapacity(e.target.value)} /></label>
        <button disabled={busy || !offeringSchool || !offeringCourse} type="submit">حفظ العرض كمسودة</button>
      </form>
    </div>

    <div style={{ overflowX: 'auto', marginTop: 24 }}>
      <h3>المدارس</h3>
      <table><thead><tr><th>المدرسة</th><th>اللغات</th><th>الحالة</th><th>الإجراء</th></tr></thead><tbody>
        {schools.map(s => <tr key={s.id}><td>{s.name}<small style={{ display: 'block' }}>{s.slug}</small></td><td>{s.supported_languages.map(l => languages.find(x => x.value === l)?.label || l).join('، ')}</td><td>{s.status}</td><td>
          <select aria-label={'حالة المدرسة ' + s.name} disabled={busy} value={s.status} onChange={e => void mutate('/api/admin/academy/structure', 'PATCH', { kind: 'school', id: s.id, status: e.target.value }, 'تم تحديث حالة المدرسة.')}>
            {['draft','active','suspended','archived'].map(status => <option key={status}>{status}</option>)}
          </select>
        </td></tr>)}
        {!schools.length && <tr><td colSpan={4}>لا توجد مدارس بعد.</td></tr>}
      </tbody></table>

      <h3 style={{ marginTop: 24 }}>الفروع</h3>
      <table><thead><tr><th>الفرع</th><th>المدرسة</th><th>اللغة</th><th>الحالة</th><th>الإجراء</th></tr></thead><tbody>
        {branches.map(b => <tr key={b.id}><td>{b.name}<small style={{ display: 'block' }}>{b.slug}</small></td><td>{schoolNameById.get(b.school_id) || b.school_id}</td><td>{languages.find(l => l.value === b.language)?.label || b.language}</td><td>{b.status}</td><td>
          <select aria-label={'حالة الفرع ' + b.name} disabled={busy} value={b.status} onChange={e => void mutate('/api/admin/academy/structure', 'PATCH', { kind: 'branch', id: b.id, status: e.target.value }, 'تم تحديث حالة الفرع.')}>
            {['draft','active','suspended','archived'].map(status => <option key={status}>{status}</option>)}
          </select>
        </td></tr>)}
        {!branches.length && <tr><td colSpan={5}>لا توجد فروع بعد.</td></tr>}
      </tbody></table>

      <h3 style={{ marginTop: 24 }}>عروض الدورات حسب المدرسة والفرع واللغة</h3>
      <table><thead><tr><th>الدورة</th><th>المدرسة / الفرع</th><th>اللغة</th><th>السعة</th><th>الحالة</th><th>الإجراء</th></tr></thead><tbody>
        {offerings.map(o => <tr key={o.id}><td>{courseNameById.get(o.course_id) || o.course_id}</td><td>{schoolNameById.get(o.school_id) || o.school_id}{o.branch_id ? ' / ' + (branchNameById.get(o.branch_id) || o.branch_id) : ' / المدرسة كلها'}</td><td>{languages.find(l => l.value === o.language)?.label || o.language}</td><td>{o.capacity ?? 'غير محددة'}</td><td>{o.status}</td><td>
          <select aria-label={'حالة العرض ' + (courseNameById.get(o.course_id) || o.course_id)} disabled={busy} value={o.status} onChange={e => void mutate('/api/admin/academy/structure', 'PATCH', { kind: 'offering', id: o.id, status: e.target.value }, 'تم تحديث حالة العرض.')}>
            {['draft','published','archived'].map(status => <option key={status}>{status}</option>)}
          </select>
        </td></tr>)}
        {!offerings.length && <tr><td colSpan={6}>لا توجد عروض دورات بعد.</td></tr>}
      </tbody></table>
    </div>
  </section>;
}
