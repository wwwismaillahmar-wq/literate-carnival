'use client';

import Link from 'next/link';
import { useAslanLanguage } from '@/components/AslanLocale';
import type { Language } from '@/components/LanguageSelector';

type TalentProfile = {
  id: string;
  headline: string | null;
  bio: string | null;
  skills: string[] | null;
};
type Labels = {
  heading: string; intro: string; loadError: string; empty: string;
  verified: string; verifiedPerson: string; create: string;
  createBody: string; manage: string;
};
const copy: Record<Language, Labels> = {
  ar: {heading:'الكفاءات المهنية الموثقة',intro:'لا يظهر في الدليل إلا الملف الذي اختار صاحبه إتاحته للعموم واجتاز مراجعة ASLAN.',loadError:'تعذر تحميل الدليل المهني؛ لم نعرض بيانات بديلة على أنها حقيقية.',empty:'لا توجد ملفات مهنية موثقة ومتاحة للعموم حاليًا.',verified:'ملف مهني موثق',verifiedPerson:'كفاءة مهنية موثقة',create:'أنشئ ملفك المهني',createBody:'أضف مهاراتك وأدلتك المهنية، ثم أرسل الملف للمراجعة. لا تمنح المنصة التوثيق تلقائيًا.',manage:'إدارة ملفي المهني'},
  fr: {heading:'Talents professionnels vérifiés',intro:'Seuls les profils rendus publics par leurs propriétaires et vérifiés par ASLAN figurent dans cet annuaire.',loadError:'Impossible de charger l’annuaire professionnel. Aucune donnée fictive n’est affichée.',empty:'Aucun profil professionnel vérifié et public pour le moment.',verified:'PROFIL VÉRIFIÉ',verifiedPerson:'Professionnel vérifié',create:'Créez votre profil professionnel',createBody:'Ajoutez vos compétences et vos justificatifs, puis soumettez votre profil à vérification. La vérification n’est jamais automatique.',manage:'Gérer mon profil'},
  en: {heading:'Verified professional talent',intro:'Only profiles made public by their owners and verified by ASLAN appear in this directory.',loadError:'The professional directory could not be loaded. No placeholder data is presented as real.',empty:'No verified public professional profiles are available yet.',verified:'VERIFIED PROFILE',verifiedPerson:'Verified professional',create:'Create your professional profile',createBody:'Add your skills and supporting evidence, then submit your profile for review. Verification is never automatic.',manage:'Manage my profile'},
  es: {heading:'Talento profesional verificado',intro:'Solo aparecen perfiles publicados por sus titulares y verificados por ASLAN.',loadError:'No se pudo cargar el directorio profesional. No se muestran datos ficticios como reales.',empty:'Aún no hay perfiles profesionales públicos y verificados.',verified:'PERFIL VERIFICADO',verifiedPerson:'Profesional verificado',create:'Crea tu perfil profesional',createBody:'Añade tus habilidades y pruebas, y envía tu perfil a revisión. La verificación nunca es automática.',manage:'Gestionar mi perfil'},
  de: {heading:'Verifizierte Fachkräfte',intro:'Nur von ihren Inhabern veröffentlichte und von ASLAN geprüfte Profile erscheinen in diesem Verzeichnis.',loadError:'Das Fachkräfteverzeichnis konnte nicht geladen werden. Es werden keine erfundenen Daten angezeigt.',empty:'Derzeit sind keine verifizierten öffentlichen Fachkräfteprofile verfügbar.',verified:'VERIFIZIERTES PROFIL',verifiedPerson:'Verifizierte Fachkraft',create:'Berufsprofil erstellen',createBody:'Fügen Sie Fähigkeiten und Nachweise hinzu und reichen Sie Ihr Profil zur Prüfung ein. Die Verifizierung erfolgt nicht automatisch.',manage:'Mein Profil verwalten'},
  pt: {heading:'Talentos profissionais verificados',intro:'Apenas perfis tornados públicos pelos seus titulares e verificados pela ASLAN aparecem neste diretório.',loadError:'Não foi possível carregar o diretório profissional. Não são apresentados dados fictícios como reais.',empty:'Ainda não existem perfis profissionais públicos e verificados.',verified:'PERFIL VERIFICADO',verifiedPerson:'Profissional verificado',create:'Crie o seu perfil profissional',createBody:'Adicione competências e comprovativos e submeta o perfil para análise. A verificação nunca é automática.',manage:'Gerir o meu perfil'},
};

export function TalentDirectoryContent({profiles,hasError}:{profiles:TalentProfile[];hasError:boolean}) {
  const {language}=useAslanLanguage();
  const t=copy[language];
  return <main className="section"><div className="wrap">
    <span className="kicker">TALENT / M35</span>
    <h1>{t.heading}</h1>
    <p className="muted">{t.intro}</p>
    {hasError && <div className="card" role="alert">{t.loadError}</div>}
    {!hasError && profiles.length===0 && <div className="card">{t.empty}</div>}
    {!hasError && <section className="grid three" style={{marginTop:24}}>
      {profiles.map(profile=><article className="card" key={profile.id}>
        <span className="kicker">{t.verified}</span>
        <h2>{profile.headline || t.verifiedPerson}</h2>
        <p className="muted">{profile.bio}</p>
        {!!profile.skills?.length && <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
          {profile.skills.map(skill=><span className="btn secondary" key={skill}>{skill}</span>)}
        </div>}
      </article>)}
    </section>}
    <section className="card" style={{marginTop:24}}>
      <h2>{t.create}</h2><p className="muted">{t.createBody}</p>
      <Link className="btn primary" href="/account/talent">{t.manage}</Link>
    </section>
  </div></main>;
}
