'use client';
import { useEffect, useState } from 'react';
export function CinematicIntro(){ const [show,setShow]=useState(false); useEffect(()=>{ if(sessionStorage.getItem('aslan-intro')) return; setShow(true); const t=setTimeout(()=>{setShow(false);sessionStorage.setItem('aslan-intro','1')},3500); return()=>clearTimeout(t)},[]); if(!show)return null; return <div className="intro" aria-hidden="true"><div className="intro-glow"/><div className="intro-brand">ASLAN MODELLING</div><div className="intro-line"/></div> }
