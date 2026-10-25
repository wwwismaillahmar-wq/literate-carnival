'use client';
import {useEffect,useState} from 'react';
import {LOCALE_EVENT, LOCALE_STORAGE_KEY, resolveLocale, applyLocale, persistLocale} from '@/lib/i18n/core';
export const languages=['ar','fr','en','es','de','pt'] as const;
export type Language=typeof languages[number];
export const languageNames:Record<Language,string>={ar:'العربية',fr:'Français',en:'English',es:'Español',de:'Deutsch',pt:'Português'};
export const navLabels:Record<Language,string[]>={
ar:['الرئيسية','السوق','الخدمات','الأكاديمية','الشركاء','الشركة','المجتمع','المواهب'],
fr:['Accueil','Marché','Services','Académie','Partenaires','Entreprise','Communauté','Talents'],
en:['Home','Market','Services','Academy','Partners','Company','Community','Talent'],
es:['Inicio','Mercado','Servicios','Academia','Socios','Empresa','Comunidad','Talento'],
de:['Startseite','Markt','Dienstleistungen','Akademie','Partner','Unternehmen','Community','Talente'],
pt:['Início','Mercado','Serviços','Academia','Parceiros','Empresa','Comunidade','Talentos']};
export function LanguageSelector({onLanguageChange}:{onLanguageChange?:(language:Language)=>void}){
 const [language,setLanguage]=useState<Language>('ar');
 useEffect(()=>{
  const saved=window.localStorage.getItem(LOCALE_STORAGE_KEY);
  const urlLocale=window.location.pathname.split('/')[1];
  const chosen=languages.some(code=>code===urlLocale)?resolveLocale(urlLocale):resolveLocale(saved);
  setLanguage(chosen);applyLocale(chosen);
  onLanguageChange?.(chosen);
  const sync=()=>{const value=resolveLocale(window.localStorage.getItem(LOCALE_STORAGE_KEY));setLanguage(value);applyLocale(value);};
  window.addEventListener(LOCALE_EVENT,sync);window.addEventListener('storage',sync);
  return ()=>{window.removeEventListener(LOCALE_EVENT,sync);window.removeEventListener('storage',sync);};
 },[onLanguageChange]);
 function change(value:string){
  const next=languages.find(item=>item===value);if(!next)return;
  setLanguage(next);persistLocale(next);
  const parts=window.location.pathname.split('/').filter(Boolean);
  const rest=languages.some(code=>code===parts[0])?parts.slice(1):parts;
  window.location.assign('/'+next+(rest.length?'/'+rest.join('/'): '')+window.location.search+window.location.hash);
  onLanguageChange?.(next);
 }
 return <label style={{display:'inline-flex',alignItems:'center',gap:5}}>
  <span aria-hidden="true">🌐</span><select aria-label="Language / اللغة" value={language} onChange={event=>change(event.target.value)} style={{maxWidth:125}}>
   {languages.map(item=><option key={item} value={item}>{languageNames[item]}</option>)}
  </select>
 </label>;
}
