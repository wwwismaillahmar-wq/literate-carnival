import {getMarketCatalog} from '@/lib/market/catalog.server';import {MarketHeader} from '@/components/market/MarketHeader';import {MarketCatalog} from '@/components/market/MarketCatalog';import styles from '@/components/market/Market.module.css';
export const dynamic='force-dynamic';export const metadata={title:'محفوظات السوق'};
export default async function SavedPage(){const catalog=await getMarketCatalog();return <main className={styles.page}><MarketHeader/><div className={styles.wrap}><MarketCatalog {...catalog} savedOnly/></div></main>;}
