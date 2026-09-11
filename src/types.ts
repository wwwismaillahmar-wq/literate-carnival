export interface Product {
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
}

export interface GalleryItem {
  id: string;
  image_url: string;
  caption: string | null;
  created_at: string;
}

export interface ServiceItem {
  number: string;
  title: string;
  description: string;
  badge?: string;
  features?: string[];
}

export interface CourseItem {
  id: string;
  title: string;
  description: string;
  category: string;
  duration: string;
  level: string;
  modules: string[];
}

export interface SocialLink {
  platform: 'whatsapp' | 'telegram' | 'instagram' | 'facebook' | 'tiktok';
  url: string;
  label: string;
}

export interface LeadFormData {
  name: string;
  phone: string;
  type: string;
  message: string;
}

export interface LeadClassification {
  classification: 'hot_lead' | 'warm_lead' | 'normal' | 'complaint' | 'inquiry';
  priority: 'high' | 'medium' | 'low';
  reason: string;
}

export interface RepoAuditReport {
  repoName: string;
  owner: string;
  lastCommitSha: string;
  status: 'VERIFIED' | 'WARNING' | 'ERROR';
  filesChecked: number;
  dataStatus: {
    productsCount: number;
    servicesCount: number;
    coursesCount: number;
    galleryCount: number;
    socialLinksCount: number;
  };
  checks: {
    title: string;
    description: string;
    passed: boolean;
    recommendation?: string;
  }[];
}

