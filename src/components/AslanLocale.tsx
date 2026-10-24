'use client';
import {useCallback,useEffect,useState} from 'react';
const LANGUAGE_EVENT='aslan:language-change';
import {languages,languageNames,type Language} from '@/components/LanguageSelector';
const translations:Record<Language,Record<string,string>>={
 ar:{home:'الرئيسية',market:'السوق',services:'الخدمات',academy:'الأكاديمية',partners:'الشركاء',company:'الشركة',community:'المجتمع',login:'تسجيل الدخول',register:'إنشاء حساب',messages:'الرسائل',notifications:'الإشعارات',support:'الدعم',reviews:'التقييمات',admin:'الإدارة',account:'الحساب',menu:'القائمة',partnerPortal:'بوابة الشريك'},
 fr:{home:'Accueil',market:'Marché',services:'Services',academy:'Académie',partners:'Partenaires',company:'Entreprise',community:'Communauté',login:'Connexion',register:'Créer un compte',messages:'Messages',notifications:'Notifications',support:'Assistance',reviews:'Avis',admin:'Administration',account:'Compte',menu:'Menu',partnerPortal:'Portail partenaires'},
 en:{home:'Home',market:'Market',services:'Services',academy:'Academy',partners:'Partners',company:'Company',community:'Community',login:'Sign in',register:'Create account',messages:'Messages',notifications:'Notifications',support:'Support',reviews:'Reviews',admin:'Admin',account:'Account',menu:'Menu',partnerPortal:'Partner portal'},
 es:{home:'Inicio',market:'Mercado',services:'Servicios',academy:'Academia',partners:'Socios',company:'Empresa',community:'Comunidad',login:'Iniciar sesión',register:'Crear cuenta',messages:'Mensajes',notifications:'Notificaciones',support:'Ayuda',reviews:'Reseñas',admin:'Administración',account:'Cuenta',menu:'Menú',partnerPortal:'Portal de socios'},
 de:{home:'Startseite',market:'Markt',services:'Dienstleistungen',academy:'Akademie',partners:'Partner',company:'Unternehmen',community:'Community',login:'Anmelden',register:'Konto erstellen',messages:'Nachrichten',notifications:'Benachrichtigungen',support:'Hilfe',reviews:'Bewertungen',admin:'Verwaltung',account:'Konto',menu:'Menü',partnerPortal:'Partnerportal'},
 pt:{home:'Início',market:'Mercado',services:'Serviços',academy:'Academia',partners:'Parceiros',company:'Empresa',community:'Comunidade',login:'Entrar',register:'Criar conta',messages:'Mensagens',notifications:'Notificações',support:'Suporte',reviews:'Avaliações',admin:'Administração',account:'Conta',menu:'Menu',partnerPortal:'Portal de parceiros'}
};
export function useAslanLanguage(){
 const [language,setLanguage]=useState<Language>('ar');
 useEffect(()=>{const saved=window.localStorage.getItem('aslan-language');const next=languages.find(item=>item===saved)||'ar';setLanguage(next);document.documentElement.lang=next;document.documentElement.dir=next==='ar'?'rtl':'ltr';const sync=()=>{const value=window.localStorage.getItem('aslan-language');const current=languages.find(item=>item===value)||'ar';setLanguage(current);document.documentElement.lang=current;document.documentElement.dir=current==='ar'?'rtl':'ltr';};window.addEventListener(LANGUAGE_EVENT,sync);window.addEventListener('storage',sync);return ()=>{window.removeEventListener(LANGUAGE_EVENT,sync);window.removeEventListener('storage',sync);};},[]);
 const change=useCallback((next:Language)=>{setLanguage(next);window.localStorage.setItem('aslan-language',next);document.documentElement.lang=next;document.documentElement.dir=next==='ar'?'rtl':'ltr';window.dispatchEvent(new Event(LANGUAGE_EVENT));},[]);
 return {language,change,t:(key:string)=>translations[language][key]||translations.ar[key]||key};
}
export function LocalePicker({language,change}:{language:Language;change:(next:Language)=>void}){
 return <label style={{display:'inline-flex',alignItems:'center',gap:5}}><span aria-hidden="true">🌐</span><select aria-label="Language / اللغة" value={language} onChange={e=>{const next=languages.find(item=>item===e.target.value);if(next)change(next);}}>{languages.map(item=><option key={item} value={item}>{languageNames[item]}</option>)}</select></label>;
}
