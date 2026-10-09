import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { whatsappLink } from '@/lib/config';
import { addProductToCart } from '../actions';

export const dynamic = 'force-dynamic';

export default async function ProductDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = await createClient();

  const { data: product, error } = await db
    .from('products')
    .select('id,name,slug,description,price_dzd,stock,active,images,created_at,category:categories(name)')
    .eq('slug', slug)
    .eq('active', true)
    .maybeSingle();

  if (error || !product) notFound();

  const { data: reviews, error: reviewsError } = await db
    .from('reviews')
    .select('id,rating,body,created_at')
    .eq('subject_type', 'product')
    .eq('subject_id', String(product.id))
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(20);
  if (reviewsError) throw new Error('تعذر تحميل تقييمات المنتج.');

  const { data: media } = await db
    .from('media_assets')
    .select('id,media_type,mime_type,object_path,bucket_id')
    .eq('product_id', product.id)
    .order('created_at', { ascending: true });

  const gallery = [];
  for (const item of media ?? []) {
    const signed = await db.storage.from(item.bucket_id ?? 'aslan-media').createSignedUrl(item.object_path, 3600);
    if (signed.data?.signedUrl) galle���q�^