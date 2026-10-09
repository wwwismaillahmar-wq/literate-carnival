import type { MetadataRoute } from 'next';
const siteUrl=(process.env.NEXT_PUBLIC_SITE_URL||'https://literate-carnival-lemon.vercel.app').replace(/\/$/,'');
export default function sitemap():MetadataRoute.Sitemap {
 return ['/','/products','/services','/academy','/company','/partners','/contact','/gallery','/members','/community'].map(path=>({
  url:siteUrl+path,lastModified:new Date(),changeFrequency:path==='/'?'daily':'weekly',
  priority:path==='/'?1:['/products','/services','/academy'].includes(path)?0.8:0.6,
 }));
}
