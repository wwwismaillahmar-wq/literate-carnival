import type { CSSProperties } from 'react';

/** Approved ASLAN lion artwork, scaled without redrawing. */
export function AslanBrandMark({size=62,className,style,decorative=false}:{size?:number;className?:string;style?:CSSProperties;decorative?:boolean}){
 return <img
   src="/brand/aslan-lion-approved.webp"
   width={size} height={size}
   className={className}
   style={{objectFit:'contain',flexShrink:0,...style}}
   alt={decorative?'':'الأسد الذهبي المعتمد لمجموعة ASLAN'}
   aria-hidden={decorative?true:undefined}
   decoding="async"
 />;
}
