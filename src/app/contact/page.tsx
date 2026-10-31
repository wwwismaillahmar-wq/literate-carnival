import {ContactForm} from '@/components/ContactForm';
import {getAcademyCatalog} from '@/lib/academy/catalog.server';
export default async function Contact({searchParams}:{searchParams:Promise<{type?:string}>}){const [params,catalog]=await Promise.all([searchParams,getAcademyCatalog()]);return <main className="section"><div className="wrap"><div className="head"><div><span className="kicker">CONTACT CENTER</span><h1>ابدأ طلبك الآن</h1></div></div><ContactForm initialType={params.type||'طلب منتج'} courses={catalog.courses}/></div></main>}
