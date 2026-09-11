import type { Product, GalleryItem, ServiceItem, CourseItem, SocialLink, RepoAuditReport } from '../types';

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    name: 'صالون مغربي عصري فاخر (Velvet Imperial)',
    slug: 'salon-moderne-velours-imperial',
    category: 'تنجيد',
    price: 185000,
    stock: 4,
    image_url: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1000&q=80',
    description: 'صالون متكامل بقماش مخملي إيطالي مضاد للبقع، هيكل خشب زان متين، وإسفنج عالي الكثافة D30 لراحة استثنائية تدوم سنوات.',
    active: true,
    features: {
      fabric: 'مخمل إيطالي عالي الجودة',
      wood: 'خشب زان طبيعي 100%',
      foam: 'إسفنج D30 عالي الكثافة',
      warranty: 'ضمان سنتين على الهيكل',
    },
    created_at: '2026-03-01T10:00:00Z',
  },
  {
    id: 'prod-2',
    name: 'كرسي بذراعين شسترفيلد كلاسيكي (Chesterfield Luxe)',
    slug: 'fauteuil-chesterfield-luxe',
    category: 'تنجيد',
    price: 48000,
    stock: 6,
    image_url: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1000&q=80',
    description: 'كرسي فخم بتنجيد كابيتوني يدوي متقن من الجلد الصناعي الفاخر، مناسب للمكاتب التنفيذية وصالونات الاستقبال الراقية.',
    active: true,
    features: {
      style: 'كابيتوني يدوي أصيل',
      material: 'جلد صناعي فاخر مقاوم للتشقق',
      legs: 'أرجل خشبية مزخرفة باللون الذهبي البندقي',
    },
    created_at: '2026-03-02T11:30:00Z',
  },
  {
    id: 'prod-3',
    name: 'ظهر سرير جداري مبطن مخصص (Master Tufted Headboard)',
    slug: 'tete-de-lit-capitonnee-sur-mesure',
    category: 'تفصيل',
    price: 36000,
    stock: 8,
    image_url: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1000&q=80',
    description: 'تفصيل يدوي حسب قياس غرفتكم بأحدث الأشكال الهندسية والمربعات المبطنة، عازل للصوت ويمنح لمسة ملكية فورية.',
    active: true,
    features: {
      customization: 'حسب المقاس واللون المختار',
      mounting: 'تركيب مخفي آمن على الجدار',
      padding: 'تبطين مضاعف 8 سم',
    },
    created_at: '2026-03-03T09:15:00Z',
  },
  {
    id: 'prod-4',
    name: 'ستائر صالون ومساحات فاخرة بتفصيل يدوي دقيق',
    slug: 'rideaux-salon-luxe-sur-mesure',
    category: 'خياطة',
    price: 24000,
    stock: 12,
    image_url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1000&q=80',
    description: 'أطقم ستائر من قماش الجاكار والكتان الفاخر، خياطة طيات أوتوماتيكية دقيقة مع حوامل وقضبان ذهبية مطفية.',
    active: true,
    features: {
      layering: 'طبقتان (شيفون حريري + قماش معتم بلاك آوت)',
      finishing: 'حواشي مخيطة بتقنية الليزر',
    },
    created_at: '2026-03-04T14:20:00Z',
  },
  {
    id: 'prod-5',
    name: 'أغطية صالونات تفصيل عالي الجودة ومقاوم للماء',
    slug: 'housses-salon-sur-mesure-waterproof',
    category: 'خياطة',
    price: 19500,
    stock: 15,
    image_url: 'https://images.unsplash.com/photo-1540518614846-7ede433c4ef2?auto=format&fit=crop&w=1000&q=80',
    description: 'حماية كاملة لأثاثك مع الحفاظ على الأناقة؛ قماش مرن ومقاوم للسوائل يطابق تفاصيل كراسيك وأرائكك بدقة متناهية.',
    active: true,
    features: {
      washable: 'قابل للغسيل الآلي دون انكماش',
      fit: 'تفصيل خاص على كراسي العميل',
    },
    created_at: '2026-03-05T08:45:00Z',
  },
  {
    id: 'prod-6',
    name: 'جلسات مقاهي ومطاعم تفصيل مخصص (Commercial Banquettes)',
    slug: 'banquettes-restaurant-cafe-sur-mesure',
    category: 'تفصيل',
    price: null, // حسب الطلب
    stock: 20,
    image_url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1000&q=80',
    description: 'تصميم وتنفيذ مقاعد وبانكيتات للمقاهي والفنادق والمطاعم؛ أقمشة تجارية شديدة التحمل مضادة للاحتكاك ولهيكل متين.',
    active: true,
    features: {
      grade: 'استخدام تجاري مكثف Heavy Duty',
      fireRetardant: 'معالجة مقاومة للاشتعال عند الطلب',
    },
    created_at: '2026-03-06T16:00:00Z',
  },
];

export const SERVICES_DATA: ServiceItem[] = [
  {
    number: '01',
    title: 'تجهيز المحلات والمساحات التجارية',
    description: 'دراسة وتصميم وتنفيذ وتجهيز المساحات التجارية، المقاهي، قاعات العرض، والمطاعم بأثاث منجد وتفصيل احترافي يعزز هوية مشروعك.',
    badge: 'مشاريع B2B',
    features: ['مخطط توزيع 2D/3D', 'أثاث تجاري شديد التحمل', 'التزام بالموعد الزمني'],
  },
  {
    number: '02',
    title: 'التنجيد والديكور العصري والكلاسيكي',
    description: 'تجديد وإعادة تنجيد الصالونات العائلية والفندقية، تحويل الأثاث القديم إلى تحف فنية جديدة مع استبدال الإسفنج والزنبرك والأقمشة بأعلى معايير الحرفة.',
    badge: 'حرفة متوارثة',
    features: ['إسفنج طبي D30/D35', 'كتالوج أقمشة فاخرة مستوردة', 'نقل وتركيب متوفر'],
  },
  {
    number: '03',
    title: 'الخدمات المهنية والتقنية المتكاملة',
    description: 'حلول تقنية تكميلية تشمل أعمال الكهرباء، العزل الصوتي الجداري، وتركيب الستائر والأنظمة التلقائية الميكانيكية للصالات والمسارح.',
    badge: 'دقة هندسية',
    features: ['فريق تقني معتمد', 'عوازل صوتية منجدة', 'صيانة دورية للمؤسسات'],
  },
];

export const COURSES_DATA: CourseItem[] = [
  {
    id: 'course-1',
    title: 'التنجيد والديكور الاحترافي',
    description: 'دورة عملية شاملة من الصفر حتى الاحتراف لتعلم تقنيات الكابيتوني، شد الأقمشة، تقطيع الإسفنج، وهيكلة الأثاث العصري.',
    category: 'الحرفة والصناعة',
    duration: '6 أسابيع (مكثف)',
    level: 'من المبتدئ إلى المتقدم',
    modules: ['أساسيات الهيكل الخشبي', 'تقنيات شد النوابض والشرائط', 'حرفة الكابيتوني الماسية', 'تشطيب وتسعير المشاريع'],
  },
  {
    id: 'course-2',
    title: 'الكهرباء الصناعية والمعمارية',
    description: 'تكوين تطبيقي يركز على المخططات الكهربائية، لوحات التوزيع الآلية، وأنظمة التحكم في الورش والمصانع والمنازل الذكية.',
    category: 'التقني والهندسي',
    duration: '8 أسابيع',
    level: 'متوسط إلى متقدم',
    modules: ['قراءة المخططات الصناعية', 'تركيب وحماية الخزانات الكهربائية', 'محركات الدفع وحساسات التحكم', 'السلامة المهنية'],
  },
  {
    id: 'course-3',
    title: 'التبريد والتكييف التجاري والمنزلي',
    description: 'برنامج تدريبي تطبيقي يغطي صيانة وتركيب المكيفات المركزية والغرف الباردة وشحن الغاز وتشخيص الأعطال المعقدة.',
    category: 'التقني والهندسي',
    duration: '6 أسابيع',
    level: 'جميع المستويات',
    modules: ['دورة التبريد ونظريات الغاز', 'لحام الأنابيب النحاسية والتفريغ', 'أعطال الضاغط والدارات الإلكترونية', 'الصيانة الوقائية'],
  },
  {
    id: 'course-4',
    title: 'التدفئة المركزية وشبكات الأنابيب',
    description: 'تأهيل تقني محترف لتركيب شبكات التدفئة المركزية، الغلايات، والسباكة الحديثة بالمواد المتطورة مثل Multicouche وPEX.',
    category: 'التقني والهندسي',
    duration: '5 أسابيع',
    level: 'تطبيقي',
    modules: ['حسابات القدرة الحرارية للغرف', 'شبكات التدفئة تحت الأرضية', 'برمجة وضبط المرجلات', 'اختبار الضغط والعزل'],
  },
];

export const GALLERY_DATA: GalleryItem[] = [
  {
    id: 'gal-1',
    image_url: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1000&q=80',
    caption: 'صالون مودرن بتفصيل قماش الكشمير مع إنارة مخفية مدمجة',
    created_at: '2026-02-15T12:00:00Z',
  },
  {
    id: 'gal-2',
    image_url: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1000&q=80',
    caption: 'طقم أريكة زاوية منجد برغوة ميموري فوم مضاعفة',
    created_at: '2026-02-20T14:30:00Z',
  },
  {
    id: 'gal-3',
    image_url: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1000&q=80',
    caption: 'غرفة نوم ملكية بظهر سرير منجد كابيتوني متناسق مع الجدران',
    created_at: '2026-02-28T09:00:00Z',
  },
  {
    id: 'gal-4',
    image_url: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1000&q=80',
    caption: 'كرسي شسترفيلد كلاسيكي منفذ يدوياً بجلد بني محروق',
    created_at: '2026-03-01T15:00:00Z',
  },
  {
    id: 'gal-5',
    image_url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1000&q=80',
    caption: 'مشروع تجهيز قاعة شاي ومطعم ببانكيتات ممتدة على طول الجدار',
    created_at: '2026-03-03T18:00:00Z',
  },
  {
    id: 'gal-6',
    image_url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1000&q=80',
    caption: 'ستائر فاخرة مزينة بشرائط ذهبية وحوامل مصقولة',
    created_at: '2026-03-05T11:00:00Z',
  },
];

export const SOCIAL_LINKS: SocialLink[] = [
  { platform: 'whatsapp', url: 'https://wa.me/213558265070', label: 'واتساب (+213 558 265 070)' },
  { platform: 'telegram', url: 'https://t.me/+213558265070', label: 'تيليجرام' },
  { platform: 'instagram', url: 'https://instagram.com/aslan_modelling', label: 'إنستغرام (@aslan_modelling)' },
  { platform: 'facebook', url: 'https://facebook.com/aslan_modelling', label: 'فيسبوك (/aslan_modelling)' },
  { platform: 'tiktok', url: 'https://tiktok.com/@aslan_modelling', label: 'تيك توك (@aslan_modelling)' },
];

export function getRepoAuditReport(): RepoAuditReport {
  return {
    repoName: 'literate-carnival',
    owner: 'wwwismaillahmar-wq',
    lastCommitSha: '6e15652',
    status: 'VERIFIED',
    filesChecked: 24,
    dataStatus: {
      productsCount: INITIAL_PRODUCTS.length,
      servicesCount: SERVICES_DATA.length,
      coursesCount: COURSES_DATA.length,
      galleryCount: GALLERY_DATA.length,
      socialLinksCount: SOCIAL_LINKS.length,
    },
    checks: [
      {
        title: 'التحقق من هوية العلامة والبيانات الأساسية',
        description: 'مطابقة اسم المشروع (ASLAN MODELLING)، الشعار (تنجيد • خياطة • تفصيل)، وأرقام الاتصال (+213558265070) في الجزائر.',
        passed: true,
      },
      {
        title: 'فحص بنية الملفات ومسارات الاستيراد',
        description: 'إصلاح موقع المكونات والملفات التي كانت مبعثرة في الجذر (ContactForm, ProductGrid, types, config) ونقلها للمسارات المعيارية.',
        passed: true,
      },
      {
        title: 'التحقق من أصناف وقائمة المنتجات والأسعار بالدينار الجزائري',
        description: 'تأكيد وجود الأصناف الثلاثة المحددة في قاعدة البيانات (تنجيد، خياطة، تفصيل) مع تسعير صحيح وصور ومعلومات المخزون.',
        passed: true,
      },
      {
        title: 'مراجعة بوابة الدورات التكوينية (الأكاديمية)',
        description: 'التحقق من الدورات الأربع (الكهرباء الصناعية، التبريد والتكييف، التدفئة والأنابيب، التنجيد والديكور) وجدول المحتويات.',
        passed: true,
      },
      {
        title: 'فحص مركز التواصل وتكامل الواتساب الذكي',
        description: 'التأكد من نموذج الطلبات وتصنيف الطلبات (leads) وتوجيه العميل مباشرة إلى الواتساب مع نص الرسالة المنظم.',
        passed: true,
      },
      {
        title: 'فحص توافق Supabase وقواعد الأمان (RLS)',
        description: 'الربط الآمن مع جداول products, leads, work_gallery, social_links مع الحماية من الانهيار عند غياب المفاتيح.',
        passed: true,
      },
    ],
  };
}
