export type Product = {
  id: string;
  name: string;
  slug: string;
  category: string | null;
  price: number | null;
  stock: number;
  image_url: string | null;
  description: string;
  active: boolean;
  features: Record<string, unknown>;
  created_at: string;
};

export type GalleryItem = {
  id: string;
  image_url: string;
  caption: string | null;
  created_at: string;
};
