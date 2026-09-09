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

  return (data ?? []).map((product) => ({
    id: product.id,
    name: product.name,
    slug: product.slug,
    category: Array.isArray(product.category) ? product.category[0]?.name ?? null : product.category?.name ?? null,
    price: product.price_dzd,
    stock: product.stock,
    image_url: firstImage(product.images),
    description: product.description,
    active: product.active,
    features: {},
    created_at: product.created_at,
  }));
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
