'use client';
import Link from 'next/link';
import {useAslanLanguage} from '@/components/AslanLocale';
const labels={
 ar:['ابحث في السوق','ابحث عن منتج، حرفة أو تجهيز...','بحث','المحفوظات','طلباتي','السلة','كل المنتجات','المتاجر','طلبات الجملة','التصنيع حسب الطلب','افتح متجرك','حقوق المعاملة','حساب السوق','بوابات السوق'],
 fr:['Rechercher','Produit, métier ou équipement...','Chercher','Favoris','Mes commandes','Panier','Tous les produits','Boutiques','Demandes en gros','Fabrication sur mesure','Ouvrir une boutique','Droits des acheteurs','Compte marché','Navigation marché'],
 en:['Search market','Product, craft or equipment...','Search','Saved','My orders','Cart','All products','Stores','Wholesale quotes','Custom manufacturing','Open your store','Transaction rights','Market account','Market navigation'],
 es:['Buscar en el mercado','Producto, oficio o equipo...','Buscar','Guardados','Mis pedidos','Carrito','Todos los productos','Tiendas','Solicitudes al por mayor','Fabricación a medida','Abre tu tienda','Derechos de compra','Cuenta','Navegación'],
 de:['Markt durchsuchen','Produkt, Handwerk oder Ausrüstung...','Suchen','Merkliste','Bestellungen','Warenkorb','Alle Produkte','Shops','Großhandelsanfragen','Maßanfertigung','Shop eröffnen','Käuferrechte','Marktkonto','Marktnavigation'],
 pt:['Pesquisar mercado','Produto, ofício ou equipamento...','Buscar','Guardados','Meus pedidos','Carrinho','Todos os produtos','Lojas','Pedidos por atacado','Fabricação sob medida','Abra sua loja','Direitos do comprador','Conta do mercado','Navegação do mercado']
} as const;
import {Search,ShoppingCart,Store,ClipboardList,Heart} from 'lucide-react';
import styles from './Market.module.css';
export function MarketHeader({query=''}:{query?:string}){
 const {language}=useAslanLanguage();const c=labels[language];
 return <div className={styles.top}><div className={styles.wrap}><div className={styles.topRow}><Link className={styles.brand} href="/market"><span>ASLAN</span> MARKET</Link><form action="/market" className={styles.search} role="search"><input name="q" defaultValue={query} key={query} aria-label={c[0]} placeholder={c[1]} type="search"/><button type="submit"><Search size={18} aria-hidden="true" style={{display:'inline',verticalAlign:'middle'}}/> {c[2]}</button></form><nav className={styles.utility} aria-label={c[12]}><Link href="/market/saved" aria-label={c[3]}><Heart size={21}/><span>{c[3]}</span></Link><Link href="/orders"><ClipboardList size={21}/><span>{c[4]}</span></Link><Link href="/cart"><ShoppingCart size={22}/><span>{c[5]}</span></Link></nav></div><nav className={styles.subnav} aria-label={c[13]}><Link href="/market#catalog">{c[6]}</Link><Link href="/market/stores">{c[7]}</Link><Link href="/market/quote?type=wholesale">{c[8]}</Link><Link href="/market/quote?type=custom">{c[9]}</Link><Link href="/market/sell"><Store size={14} aria-hidden="true" style={{display:'inline',verticalAlign:'middle'}}/> {c[10]}</Link><Link href="/guides/rules#transactions">{c[11]}</Link></nav></div></div>;
}
