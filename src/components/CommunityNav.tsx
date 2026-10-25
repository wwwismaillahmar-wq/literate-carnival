'use client';
import Link from 'next/link';
import { useAslanLanguage } from '@/components/AslanLocale';

const links = [
  ['/community', 'community'], ['/members', 'members'], ['/account/friends', 'friends'],
  ['/account/friend-requests', 'friendRequests'], ['/account/messages', 'messages'],
  ['/account/posts', 'myPosts'], ['/account/contributions', 'myContributions'],
] as const;

export default function CommunityNav() {
  const { t } = useAslanLanguage();
  return <nav className="community-nav" aria-label={t('community')}>
    {links.map(([href, label]) => <Link key={href} href={href}>{t(label)}</Link>)}
  </nav>;
}
