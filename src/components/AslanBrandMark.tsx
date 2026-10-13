import type { CSSProperties } from 'react';

export function AslanBrandMark({size=62,className,style,decorative=false}:{size?:number;className?:string;style?:CSSProperties;decorative?:boolean}){
 return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width={size} height={size} className={className} style={style}
 role={decorative?'presentation':'img'} aria-label={decorative?undefined:'رمز الأسد لمجموعة ASLAN'} aria-hidden={decorative?true:undefined}>
 <defs><linearGradient id="aslanGold" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fbe1a0"/><stop offset=".56" stopColor="#cc9b48"/><stop offset="1" stopColor="#946324"/></linearGradient></defs>
 <path fill="url(#aslanGold)" d="M51 5 38 12 27 6 25 21 12 26 18 39 7 52 18 58 11 71 25 74 22 88 39 83 49 97 63 89 74 93 77 79 88 77 83 63 95 56 84 43 87 32 74 30 72 15 61 21Z"/>
 <path fill="#13293b" d="M52 18c-13 2-22 9-27 20 8-4 14-3 18-2-8 6-12 13-13 23 7-6 14-8 19-7-8 9-9 19-7 31 5-6 11-10 17-12l-1 13c9-8 10-18 12-25 7 0 16-4 22-10l-19-5-5-9-11-2-2-10Z"/>
 <path fill="url(#aslanGold)" d="M46 29c10-8 21-8 30 2l7 12 12 5-13 9-13-1-6 8-12 7c7-10 3-15-7-21 9-2 17-5 17-10-5-6-10-9-15-11Z"/>
 <path fill="#142738" d="m70 39 10 2-8 3-5-2Z"/>
 </svg>;
}