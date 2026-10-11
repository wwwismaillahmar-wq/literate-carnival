import type { MetadataRoute } from 'next';
const siteUrl=(process.env.NEXT_PUBLIC_SITE_URL||'https://literate-carnival-lemon.vercel.app').replace(/\/$/,'');
export default function robots():MetadataRoute.Robots {
 return {rules:[{userAgent:'*',allow:'/',disallow:['/admin/','/account/','/checkout','/cart','/orders','/invoices','/notifications','/support','/reviews','/service-requests']}],sitemap:siteUrl+'/sitemap.xml'};
}
