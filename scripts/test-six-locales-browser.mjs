#!/usr/bin/env node
// Isolated real-Chromium acceptance: six languages x eight public spaces.
// No production writes, credentials, remote uploads or live database mutations.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import net from 'node:net';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const langs = ['ar','fr','en','es','de','pt'];
const routes = ['/','/market','/services','/academy','/partners','/company','/community','/talent'];
const labels = {
  ar:['الرئيسية','السوق','الخدمات','الأكاديمية','الشركاء','الشركة','المجتمع','المواهب'],
  fr:['Accueil','Marché','Services','Académie','Partenaires','Entreprise','Communauté','Talents'],
  en:['Home','Market','Services','Academy','Partners','Company','Community','Talent'],
  es:['Inicio','Mercado','Servicios','Academia','Socios','Empresa','Comunidad','Talento'],
  de:['Startseite','Markt','Dienstleistungen','Akademie','Partner','Unternehmen','Community','Talente'],
  pt:['Início','Mercado','Serviços','Academia','Parceiros','Empresa','Comunidade','Talentos'],
};
const port = await new Promise((resolve,reject) => {
  const server=net.createServer();
  server.once('error',reject);
  server.listen(0,'127.0.0.1',()=>{const p=server.address().port;server.close(()=>resolve(p));});
});
const fixturePort=3215;
if (process.env.NEXT_PUBLIC_SUPABASE_URL !== 'http://127.0.0.1:'+fixturePort)
  throw Error('Refusing to run browser acceptance without isolated local Supabase fixture URL');
const fixture=createServer((req,res)=>{
  res.setHeader('Content-Type','application/json');
  if(req.url?.startsWith('/auth/v1/user')){res.writeHead(401).end('{"message":"not authenticated"}');return;}
  res.writeHead(200).end('[]');
});
await new Promise((resolve,reject)=>fixture.once('error',reject).listen(fixturePort,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+port;
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-p',String(port),'-H','127.0.0.1'],{
  stdio:['ignore','pipe','pipe'],env:{...process.env,PORT:String(port)},
});
let output='';
for (const stream of [child.stdout,child.stderr]) stream.on('data',part=>{output=(output+part.toString()).slice(-6000);});
let browser;
try {
  let ready=false;
  for(let i=0;i<50;i++){
    if(child.exitCode!==null) throw Error('Next.js exited: '+output);
    try {const r=await fetch(origin+'/robots.txt',{signal:AbortSignal.timeout(2000)});if(r.status<500){ready=true;break;}}catch{}
    await new Promise(resolve=>setTimeout(resolve,500));
  }
  if(!ready)throw Error('Next.js readiness timeout: '+output);
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const context=await browser.newContext({viewport:{width:1440,height:900}});
  await context.addInitScript(()=>{localStorage.setItem('aslan-intro','1');});
  const page=await context.newPage();
  const picker='select[aria-label="Language / اللغة"]';
  async function verify(code, route) {
    await page.goto(origin+route,{waitUntil:'domcontentloaded',timeout:30000});
    await page.locator(picker).waitFor({timeout:20000});
    await page.waitForFunction(expected=>{
      return document.documentElement.lang===expected &&
        document.documentElement.dir===(expected==='ar'?'rtl':'ltr') &&
        localStorage.getItem('aslan-language')===expected &&
        document.querySelector('select[aria-label="Language / اللغة"]')?.value===expected;
    },code,{timeout:15000});
    assert.equal(new URL(page.url()).pathname,route,'unexpected redirect '+code+':'+route);
    const nav=page.locator('nav.shell-nav a');
    assert.equal(await nav.count(),8,'navigation count '+code+':'+route);
    for(let n=0;n<8;n++){
      assert.equal((await nav.nth(n).textContent()).trim(),labels[code][n],code+':'+route+':'+n);
      assert.equal(new URL(await nav.nth(n).getAttribute('href'),origin).pathname,routes[n]);
    }
  }
  let checked=0;
  for(const code of langs){
    await page.goto(origin+'/',{waitUntil:'domcontentloaded'});
    await page.locator(picker).selectOption(code);
    await page.waitForFunction(expected=>document.documentElement.lang===expected,code);
    for(const route of routes){await verify(code,route);checked++;}
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(expected=>document.documentElement.lang===expected && document.querySelector('select[aria-label="Language / اللغة"]')?.value===expected,code);
  }
  const second=await context.newPage();
  await second.goto(origin+'/',{waitUntil:'domcontentloaded'});
  await second.locator(picker).waitFor();
  await page.locator(picker).selectOption('ar');
  await second.waitForFunction(()=>document.documentElement.lang==='ar'&&document.documentElement.dir==='rtl'&&document.querySelector('select[aria-label="Language / اللغة"]')?.value==='ar',null,{timeout:15000});
  console.log('ASLAN_BROWSER_LOCALE_PASS cases='+checked+' persistence=6 cross_tab=1 rtl_ltr=1');
} finally {
  await browser?.close();
  child.kill('SIGTERM');
  await new Promise(resolve=>fixture.close(resolve));
}
