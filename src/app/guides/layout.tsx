import Link from 'next/link';
import styles from '@/components/Guides.module.css';
export default function GuidesLayout({children}:{children:React.ReactNode}) {
 return <main><section className={styles.hero}><div className="wrap"><span className="kicker">ASLAN · مركز الأدلة</span><h1>استخدم الموقع بثقة ووضوح.</h1><p>خطوات الاستخدام، مسؤوليات كل دور، وقواعد تحمي كرامة الأشخاص وخصوصيتهم وحقوق أطراف المعاملة.</p><nav className={styles.nav} aria-label="أقسام الأدلة"><Link href="/guides">دليل المستخدم</Link><Link href="/guides/management">دليل الإدارة والأدوار</Link><Link href="/guides/rules">قواعد الاستخدام والمعاملات</Link><Link href="/account/authorization">صلاحيات حسابي</Link></nav></div></section><div className={'wrap '+styles.body}>{children}</div></main>;
}
