import Link from 'next/link';

export default function CommunityNav(){
  const links=[['/community','المجتمع'],['/members','الأعضاء'],['/account/friends','الأصدقاء'],['/account/friend-requests','طلبات الصداقة'],['/account/messages','الرسائل'],['/account/posts','منشوراتي'],['/account/contributions','مساهماتي']];
  return <nav className="community-nav" aria-label="تنقل المجتمع">{links.map(([href,label])=><Link key={href} href={href}>{label}</Link>)}</nav>;
}
