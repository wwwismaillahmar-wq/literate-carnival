'use client';
import Link from 'next/link';
import { useAslanLanguage } from '@/components/AslanLocale';
import { SectorHero } from '@/components/SectorHero';

// Public community interface copy; user-generated posts remain in their original language.
export const communityCopy = {
  "ar": {
    "title": "مجتمع ASLAN",
    "description": "مساحة للتواصل المهني والمحتوى الذي تسمح لك إعدادات الخصوصية برؤيته.",
    "create": "إنشاء منشور",
    "members": "استكشف الأعضاء",
    "asideTitle": "تواصل وشارك أعمالك",
    "asideDescription": "تابع المنشورات، وأدِر صداقاتك، وتواصل مع زملائك من حسابك.",
    "messages": "الرسائل والمحادثات",
    "emptyTitle": "لا توجد منشورات متاحة بعد.",
    "emptyDescription": "ابدأ بمنشور عام، أو أضف أصدقاء لرؤية محتوى الأصدقاء.",
    "signIn": "تسجيل الدخول"
  },
  "fr": {
    "title": "Communauté ASLAN",
    "description": "Un espace d’échanges professionnels où vous voyez les contenus autorisés par vos paramètres de confidentialité.",
    "create": "Créer une publication",
    "members": "Découvrir les membres",
    "asideTitle": "Échangez et partagez vos réalisations",
    "asideDescription": "Suivez les publications, gérez vos amis et échangez avec vos collègues.",
    "messages": "Messages et discussions",
    "emptyTitle": "Aucune publication disponible pour le moment.",
    "emptyDescription": "Publiez un message public ou ajoutez des amis pour voir leurs publications.",
    "signIn": "Se connecter"
  },
  "en": {
    "title": "ASLAN Community",
    "description": "A space for professional connections and content visible under your privacy settings.",
    "create": "Create a post",
    "members": "Explore members",
    "asideTitle": "Connect and share your work",
    "asideDescription": "Follow posts, manage friendships and message colleagues from your account.",
    "messages": "Messages and chats",
    "emptyTitle": "No posts available yet.",
    "emptyDescription": "Share a public post or add friends to see their content.",
    "signIn": "Sign in"
  },
  "es": {
    "title": "Comunidad ASLAN",
    "description": "Un espacio de conexión profesional con contenido visible según tu configuración de privacidad.",
    "create": "Crear publicación",
    "members": "Explorar miembros",
    "asideTitle": "Conecta y comparte tu trabajo",
    "asideDescription": "Sigue publicaciones, gestiona amistades y conversa con colegas desde tu cuenta.",
    "messages": "Mensajes y chats",
    "emptyTitle": "Todavía no hay publicaciones disponibles.",
    "emptyDescription": "Comparte una publicación pública o añade amigos para ver su contenido.",
    "signIn": "Iniciar sesión"
  },
  "de": {
    "title": "ASLAN-Community",
    "description": "Ein Raum für beruflichen Austausch und Inhalte, die Ihre Datenschutzeinstellungen erlauben.",
    "create": "Beitrag erstellen",
    "members": "Mitglieder entdecken",
    "asideTitle": "Vernetzen und Arbeiten teilen",
    "asideDescription": "Beiträge verfolgen, Freundschaften verwalten und Kollegen Nachrichten senden.",
    "messages": "Nachrichten und Chats",
    "emptyTitle": "Noch keine Beiträge verfügbar.",
    "emptyDescription": "Veröffentlichen Sie einen öffentlichen Beitrag oder fügen Sie Freunde hinzu.",
    "signIn": "Anmelden"
  },
  "pt": {
    "title": "Comunidade ASLAN",
    "description": "Um espaço de ligação profissional com conteúdos visíveis segundo as suas definições de privacidade.",
    "create": "Criar publicação",
    "members": "Explorar membros",
    "asideTitle": "Ligue-se e partilhe o seu trabalho",
    "asideDescription": "Acompanhe publicações, gira amizades e converse com colegas na sua conta.",
    "messages": "Mensagens e conversas",
    "emptyTitle": "Ainda não existem publicações disponíveis.",
    "emptyDescription": "Partilhe uma publicação pública ou adicione amigos para ver os seus conteúdos.",
    "signIn": "Entrar"
  }
} as const;

export function CommunityIntro() {
  const { language } = useAslanLanguage();
  const t = communityCopy[language];
  return <SectorHero eyebrow="ASLAN COMMUNITY" title={t.title} description={t.description}
    primary={{ href: '/account/posts', label: t.create }}
    secondary={{ href: '/members', label: t.members }}
    aside={{ title: t.asideTitle, description: t.asideDescription,
      action: { href: '/account/messages', label: t.messages } }} />;
}

export function CommunityEmpty({ authenticated }: { authenticated: boolean }) {
  const { language } = useAslanLanguage();
  const t = communityCopy[language];
  return <div className="card"><h2>{t.emptyTitle}</h2><p className="muted">{t.emptyDescription}</p>
    <Link className="btn primary" href={authenticated ? '/account/posts' : '/login?next=/community'}>
      {authenticated ? t.create : t.signIn}
    </Link>
  </div>;
}
