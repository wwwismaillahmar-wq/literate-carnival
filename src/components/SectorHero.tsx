import Link from 'next/link';
import { ArrowLeft, ArrowUpLeft } from 'lucide-react';
import styles from './SectorHero.module.css';

type Action = { href: string; label: string };
type Props = {
  eyebrow: string;
  title: string;
  description: string;
  primary: Action;
  secondary?: Action;
  aside: { title: string; description: string; action: Action };
};

/** Visual-language primitive shared by non-commerce sector landing pages. */
export function SectorHero({ eyebrow, title, description, primary, secondary, aside }: Props) {
  return <section className={styles.hero} aria-label={title}>
    <div className={styles.main}>
      <span className={styles.eyebrow}>{eyebrow}</span>
      <h1>{title}</h1>
      <p>{description}</p>
      <div className={styles.actions}>
        <Link className={styles.primary} href={primary.href}>{primary.label} <ArrowLeft size={17} aria-hidden="true"/></Link>
        {secondary && <Link className={styles.secondary} href={secondary.href}>{secondary.label}</Link>}
      </div>
    </div>
    <aside className={styles.side}>
      <span className={styles.sideLabel}>ASLAN MODELLING GROUP</span>
      <h2>{aside.title}</h2>
      <p>{aside.description}</p>
      <Link className={styles.sideLink} href={aside.action.href}>{aside.action.label} <ArrowUpLeft size={16} aria-hidden="true"/></Link>
    </aside>
  </section>;
}
