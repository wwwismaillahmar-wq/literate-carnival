'use client';

import Link from 'next/link';
import { useAslanLanguage } from '@/components/AslanLocale';
import { SectorHero } from '@/components/SectorHero';
import { companyCopy, companySections } from '@/lib/i18n/company';

export function CompanyLanding({ publishedTypes }: { publishedTypes: string[] }) {
  const { language } = useAslanLanguage();
  const t = companyCopy[language];
  return <main className="section"><div className="wrap">
    <SectorHero eyebrow="ASLAN MODELLING GROUP" title={t.title} description={t.description}
      primary={{href:'/company/about',label:t.about}}
      secondary={{href:'/company/portfolio',label:t.portfolio}}
      aside={{title:t.asideTitle,description:t.asideBody,action:{href:'/contact',label:t.contact}}}/>
    <div className="grid three" style={{marginTop:32}}>
      {companySections.map(type => {
        const count = publishedTypes.filter(value => value === type).length;
        return <Link className="card" href={`/company/${type}`} key={type}>
          <span className="kicker">{type.toUpperCase()}</span>
          <h2>{t.sections[type]}</h2>
          <p>{count ? t.count.replace('{count}', String(count)) : t.empty}</p>
        </Link>;
      })}
    </div>
  </div></main>;
}
