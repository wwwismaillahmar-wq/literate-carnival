import { createClient } from '@/lib/supabase/server';
import type { GalleryItem, Product } from '@/lib/types';

function firstImage(images: unknown): string | null {
  if (Array.isArray(images)) {
    const first = images.find((item) => typeof item === 'string');
    return typeof first === 'string' ? first : null;
  }
  if (images && typeof images === 'object') {
    const candidate = images as Record<string, unknown>;
    for (const key of ['url', 'image_url', 'src']) {
      if (typeof candidate[key] === 'string') return candidate[key] as string;
    }
  }
  return null;
}

export async function getProducts(): Promise<Product[]> {
  const db = await createClient();
  const { data, error } = await db
    .from('products')
    .select('id,name,slug,description,price_dzd,stock,active,images,created_at,category:categories(name)')
    .eq('active', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('getProducts failed:', error.message);
    return [];
  }

  return (data ?? []).map((product) => {
    const categoryData = product.category as { name: string } | { name: string }[] | null;
    const categoryName = Array.isArray(categoryData) ? categoryData[0]?.name ?? null : categoryData?.name ?? null;

    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      category: categoryName,
      price: product.price_dzd,
      stock: product.stock,
      image_url: firstImage(product.images),
      description: product.description,
      active: product.active,
      features: {},
      created_at: product.created_at,
    };
  });
}

export async function getHomepageProducts() {
  const db = await createClient();
  const { data: products, error } = await db
    .from('products')
    .select('id,name,slug,description,price_dzd,stock,images,category_id,created_at,ad_priority,home_featured,category:categories(name)')
    .eq('active', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('getHomepageProducts products failed:', error.message);
    return [];
  }

  const ids = (products ?? []).map((product) => product.id);
  const { data: leads } = ids.length
    ? await db.from('leads').select('product_id,status').in('product_id', ids)
    : { data: [] };

  const leadCounts = new Map<number, number>();
  for (const lead of leads ?? []) {
    if (!lead.product_id) continue;
    leadCounts.set(lead.product_id, (leadCounts.get(lead.product_id) ?? 0) + 1);
  }

  const { data: media } = ids.length
    ? await db
        .from('media_assets')
        .select('id,product_id,media_type,object_path,bucket_id,created_at')
        .in('product_id', ids)
        .eq('media_type', 'image')
        .order('created_at', { ascending: true })
    : { data: [] };

  const mediaByProduct = new Map<number, string[]>();
  for (const item of media ?? []) {
    const signed = await db.storage.from(item.bucket_id ?? 'aslan-media').createSignedUrl(item.object_path, 3600);
    if (!signed.data?.signedUrl || !item.product_id) continue;
    const list = mediaByProduct.get(item.product_id) ?? [];
    list.push(signed.data.signedUrl);
    mediaByProduct.set(item.product_id, list);
  }

  const now = Date.now();
  return (products ?? [])
    .map((product) => {
      const ageDays = Math.max(0, (now - new Date(product.created_at).getTime()) / 86_400_000);
      const isNew = ageDays <= 14;
      const demand = leadCounts.get(product.id) ?? 0;
      const adPriority = Number(product.ad_priority ?? 0);
      const featured = Boolean(product.home_featured);
      const score =
        (featured ? 10000 : 0) +
        adPriority * 100 +
        demand * 80 +
        (isNew ? Math.max(0, 1200 - ageDays * 70) : 0);

      const categoryData = product.category as { name: string } | { name: string }[] | null;
      const categoryName = Array.isArray(categoryData) ? categoryData[0]?.name ?? null : categoryData?.name ?? null;
      const badges: string[] = [];
      if (featured) badges.push('مميز');
      if (demand > 0) badges.push('عليه طلب');
      if (isNew) badges.push('جديد');
      if (adPriority >= 50) badges.push('مدعوم');

      return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description ?? '',
        price: product.price_dzd,
        stock: product.stock,
        image_url: firstImage(product.images),
        media_urls: mediaByProduct.get(product.id) ?? [],
        category: categoryName,
        badges,
        score,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 12)
    .map(({ score: _score, ...product }) => product);
}

export async function getGallery(): Promise<GalleryItem[]> {
  const db = await createClient();
  const { data, error } = await db
    .from('work_gallery')
    .select('id,image_url,caption,created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('getGallery failed:', error.message);
    return [];
  }

  return (data ?? []) as GalleryItem[];
}
