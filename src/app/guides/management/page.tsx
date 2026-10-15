import Link from 'next/link';
import { roleGuides } from '@/lib/guides';
import styles from '@/components/Guides.module.css';
export const metadata={title:'دليل الإدارة والأدوار والصلاحيات'};
export default function ManagementGuidePage(){
 return <><h2>دليل الإدارة وأصحاب المهام</h2><p className="lead">لكل دور مهمة وحدود. راجع بطاقة دورك ثم تحقق من الأذونات المتاحة لحسابك.</p>
 <div className={styles.hint}><strong>المهمة والصلاحية ليستا الشيء نفسه.</strong><p>البطاقات تشرح مسؤوليات الأدوار. الوصول الفعلي تحدده الأذونات المسندة للحساب، والعضوية النشطة في المؤسسة، وإسناد الدورات. بعض لوحات الإدارة الحالية محصورة في المدير العام؛ تعيين اسم دور وحده لا يفتحها.</p><Link href="/account/authorization">عرض صلاحيات حسابي الفعلية ←</Link></div>
 <nav className={styles.nav} aria-label="اختيار الدور">{roleGuides.map(role=><Link key={role.key} href={'#role-'+role.key}>{role.name}</Link>)}</nav>
 <section className={styles.roles} aria-label="مهام الأدوار">{roleGuides.map(role=><details id={'role-'+role.key} className={styles.role} key={role.key}><summary>{role.name}</summary><p>{role.mission}</p><h3>المهام</h3><ul>{role.tasks.map(task=><li key={task}>{task}</li>)}</ul><strong>حدود الاستخدام والصلاحية</strong><p>{role.limits}</p>{role.key==='instructor'&&<Link href="/academy/teaching">مكتب التدريس ←</Link>}</details>)}</section>
 <section className={styles.block}><h2>طريقة العمل الإداري</h2><ol><li>تحقق من الدور والإذن قبل معالجة أي طلب. لا تستخدم حساب زميل لتجاوز المنع.</li><li>راجع المعلومات والأدلة ذات الصلة فقط. لا تجمع معلومات شخصية لا يحتاجها العمل.</li><li>وضّح سبب القرار والخطوة التالية، ودوّن الملاحظات في السجل أو الطلب المخصص عند توفره.</li><li>افصل طلب القبول عن الدفع واعتماد التسجيل، ولا تغيّر حالة مالية قبل التحقق من مرجعها.</li><li>استخدم النشر لإظهار معلومات معتمدة فقط؛ لا تعلن عن دورة أو سعر أو شهادة غير مؤكدة.</li><li>راجع الشكاوى دون تحيز، واحفظ خصوصية الأطراف، وارفع المسائل خارج صلاحيتك إلى المسؤول المخول.</li></ol></section>
 <section className={styles.block}><h2>دليل المدير العام للبوابات الحالية</h2><div className={styles.tableWrap}><table className={styles.table}><thead><tr><th scope="col">المهمة</th><th scope="col">البوابة</th><th scope="col">ما يجب مراجعته</th></tr></thead><tbody>
 <tr><td>الأدوار والوصول</td><td><Link href="/admin/access">إدارة الصلاحيات</Link></td><td>أقل صلاحية لازمة، وعدم فقدان حساب الإدارة.</td></tr>
 <tr><td>الدورات والقبول</td><td><Link href="/admin/academy">إدارة الأكاديمية</Link></td><td>البرنامج والسعر وحالة النشر والإسناد وقرارات الطلبات.</td></tr>
 <tr><td>واجهة الأكاديمية والإعلانات</td><td><Link href="/admin/site-settings">إعدادات الموقع</Link></td><td>مجال الدورة، الغلاف، التمييز في الرئيسية، ونصوص الإعلانات.</td></tr>
 <tr><td>الفواتير والمدفوعات</td><td><Link href="/admin/payments">متابعة المدفوعات</Link></td><td>المبلغ والمرجع وحالة المعاملة قبل اعتمادها.</td></tr>
 <tr><td>مراجعة العمليات</td><td><Link href="/admin/audit">سجل التدقيق</Link></td><td>ما تم تسجيله من عمليات إدارية وأسباب القرارات.</td></tr>
 </tbody></table></div><p className="muted">ظهور رابط في الدليل لا يمنح الوصول. البوابات تتحقق من صلاحية الحساب.</p></section>
 <div className={styles.links}><Link href="/guides/rules">قواعد الاستخدام والمسؤولية</Link><Link href="/support">رفع استفسار بشأن الصلاحيات</Link></div>
 </>;
}
