import type { Language } from '@/components/LanguageSelector';

export const companySections = ["about","vision","mission","activity","project","portfolio","news","faq"] as const;
export type CompanySection = (typeof companySections)[number];

type CompanyCopy = {
  title: string;
  description: string;
  about: string;
  portfolio: string;
  asideTitle: string;
  asideBody: string;
  contact: string;
  empty: string;
  count: string;
  sections: Record<CompanySection, string>;
};

// UI copy only. Admin-published content remains in its original language.
export const companyCopy: Record<Language, CompanyCopy> = {
  "ar": {
    "title": "تعرف على المجموعة",
    "description": "رؤيتنا ورسالتنا ومجالات نشاطنا ومشاريعنا وأعمالنا وأخبارنا.",
    "about": "من نحن",
    "portfolio": "أعمالنا",
    "asideTitle": "الحرفة والتصميم والعمل",
    "asideBody": "نحوّل الحرفة إلى علامة، والتصميم إلى قيمة. استكشف المعلومات الرسمية المتاحة عن المؤسسة.",
    "contact": "التواصل مع ASLAN",
    "empty": "المحتوى سيضاف من لوحة الإدارة.",
    "count": "{count} عنصر منشور",
    "sections": {
      "about": "عن ASLAN",
      "vision": "الرؤية",
      "mission": "الرسالة",
      "activity": "الأنشطة",
      "project": "المشاريع",
      "portfolio": "معرض الأعمال",
      "news": "الأخبار",
      "faq": "الأسئلة الشائعة"
    }
  },
  "fr": {
    "title": "Découvrez le groupe",
    "description": "Notre vision, notre mission, nos activités, projets, réalisations et actualités.",
    "about": "Qui sommes-nous ?",
    "portfolio": "Nos réalisations",
    "asideTitle": "Savoir-faire, design et engagement",
    "asideBody": "Nous faisons du savoir-faire une marque et du design une valeur. Découvrez les informations officielles sur le groupe.",
    "contact": "Contacter ASLAN",
    "empty": "Le contenu sera ajouté depuis l’administration.",
    "count": "{count} éléments publiés",
    "sections": {
      "about": "À propos d’ASLAN",
      "vision": "Vision",
      "mission": "Mission",
      "activity": "Activités",
      "project": "Projets",
      "portfolio": "Réalisations",
      "news": "Actualités",
      "faq": "Questions fréquentes"
    }
  },
  "en": {
    "title": "Discover the group",
    "description": "Our vision, mission, activities, projects, portfolio and news.",
    "about": "About us",
    "portfolio": "Our work",
    "asideTitle": "Craft, design and dedication",
    "asideBody": "We turn craftsmanship into a brand and design into value. Explore official information about the group.",
    "contact": "Contact ASLAN",
    "empty": "Content will be added from the admin dashboard.",
    "count": "{count} published items",
    "sections": {
      "about": "About ASLAN",
      "vision": "Vision",
      "mission": "Mission",
      "activity": "Activities",
      "project": "Projects",
      "portfolio": "Portfolio",
      "news": "News",
      "faq": "Frequently asked questions"
    }
  },
  "es": {
    "title": "Conoce el grupo",
    "description": "Nuestra visión, misión, actividades, proyectos, trabajos y noticias.",
    "about": "Quiénes somos",
    "portfolio": "Nuestros trabajos",
    "asideTitle": "Oficio, diseño y compromiso",
    "asideBody": "Convertimos el oficio en marca y el diseño en valor. Consulta la información oficial del grupo.",
    "contact": "Contactar con ASLAN",
    "empty": "El contenido se añadirá desde la administración.",
    "count": "{count} elementos publicados",
    "sections": {
      "about": "Acerca de ASLAN",
      "vision": "Visión",
      "mission": "Misión",
      "activity": "Actividades",
      "project": "Proyectos",
      "portfolio": "Trabajos",
      "news": "Noticias",
      "faq": "Preguntas frecuentes"
    }
  },
  "de": {
    "title": "Die Gruppe kennenlernen",
    "description": "Unsere Vision, Mission, Tätigkeiten, Projekte, Arbeiten und Neuigkeiten.",
    "about": "Über uns",
    "portfolio": "Unsere Arbeiten",
    "asideTitle": "Handwerk, Design und Engagement",
    "asideBody": "Wir machen Handwerk zur Marke und Design zum Wert. Entdecken Sie offizielle Informationen über die Gruppe.",
    "contact": "ASLAN kontaktieren",
    "empty": "Inhalte werden über die Verwaltung ergänzt.",
    "count": "{count} veröffentlichte Einträge",
    "sections": {
      "about": "Über ASLAN",
      "vision": "Vision",
      "mission": "Mission",
      "activity": "Tätigkeiten",
      "project": "Projekte",
      "portfolio": "Referenzen",
      "news": "Neuigkeiten",
      "faq": "Häufige Fragen"
    }
  },
  "pt": {
    "title": "Conheça o grupo",
    "description": "A nossa visão, missão, atividades, projetos, trabalhos e notícias.",
    "about": "Quem somos",
    "portfolio": "Os nossos trabalhos",
    "asideTitle": "Ofício, design e dedicação",
    "asideBody": "Transformamos o ofício numa marca e o design em valor. Consulte as informações oficiais do grupo.",
    "contact": "Contactar a ASLAN",
    "empty": "O conteúdo será adicionado na administração.",
    "count": "{count} itens publicados",
    "sections": {
      "about": "Sobre a ASLAN",
      "vision": "Visão",
      "mission": "Missão",
      "activity": "Atividades",
      "project": "Projetos",
      "portfolio": "Portefólio",
      "news": "Notícias",
      "faq": "Perguntas frequentes"
    }
  }
};
