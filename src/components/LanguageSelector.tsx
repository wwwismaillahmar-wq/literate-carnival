'use client';
import {useEffect,useState} from 'react';
export const languages=['ar','fr','en','es','de','pt'] as const;
export type Language=typeof languages[number];
export const languageNames:Record<Language,string>={ar:'العربية',fr:'Français',en:'English',es:'Español',de:'Deutsch',pt:'Português'};
export const navLabels:Record<Language,string[]>={
ar:['الرئيسية','السوق','الخدمات','الأكاديمية','الشركاء','الشركة','المجتمع'],
fr:['Accueil','Marché','Services','Académie','Partenaires','Entreprise','Communauté'],
en:['Home','Market','Services','Academy','Partners','Company','Community'],
es:['Inicio','Mercado','Servicios','Academia','Socios','Empresa','Comunidad'],
de:['Startseite','Markt','Dienstleistungen','Akademie','Partner','Unternehmen','Community'],
pt:['Início','Mercado','Serviços','Academia','Parceiros','Empresa','Comunidade']};
export function LanguageSelector({onLanguageChange}:{onLanguageChange?:(language:Language)=>void}){
 const [language,setLanguage]=useState<Language>('ar');
 useEffect(()=>{
  const saved=window.localStorage.getItem('aslan-language');
  const chosen=languages.find(item=>item===saved)||'ar';
  setLanguage(chosen);document.documentElement.lang=chosen;document.documentElement.dir=chosen==='ar'?'rtl':'ltr';
  onLanguageChange?.(chosen);
 },[onLanguageChange]);
 function change(value:string){
  const next=languages.find(item=>item===value);if(!next)return;
  setLanguage(next);window.localStorage.setItem('aslan-language',next);
  document.documentElement.lang=next;document.documentElement.dir=next==='ar'?'rtl':'ltr';
  window.dispatchEvent(new Event('aslan:language-change'));
  onLanguageChange?.(next);
 }
 return <label style={{display:'inline-flex',alignItems:'center',gap:5}}>
  <span aria-hidden="true">🌐</span><select aria-label="Language / اللغة" value={language} onChange={event=>change(event.target.value)} style={{maxWidth:125}}>
   {languages.map(item=><option key={item} value={item}>{languageNames[item]}</option>)}
  </select>
 </label>;
}
