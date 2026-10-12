import {getMarketCatalog} from '@/lib/market/catalog.server';import {MarketHeader} from '@/components/market/MarketHeader';import {MarketCompare} from '@/components/market/MarketCompare';import styles from '@/components/market/Market.module.css';
export const dynamic='force-dynamic';export const metadata={title:'مقارنة المنتجات'};
export default async function ComparePage(){const catalog=await getMarketCatalog();return <main className={styles.page}><MarketHeader/><div className={styles.wrap}><MarketCompare products={catalog.products} stores={catalog.stores}/></div></main>;}
