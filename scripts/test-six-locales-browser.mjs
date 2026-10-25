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
const normalizePath = path => path==='/'?'/':path.replace(/\/+$/,'');
const talentHeadings = {ar:'الكفاءات المهنية الموثقة',fr:'Talents professionnels vérifiés',en:'Verified professional talent',es:'Talento profesional verificado',de:'Verifizierte Fachkräfte',pt:'Talentos profissionais verificados'};
const companyHeadings = {"ar":"تعرف على المجموعة","fr":"Découvrez le groupe","en":"Discover the group","es":"Conoce el grupo","de":"Die Gruppe kennenlernen","pt":"Conheça o grupo"};
const companySectionLabels = {"ar":["عن ASLAN","الرؤية","الرسالة","الأنشطة","المشاريع","معرض الأعمال","الأخبار","الأسئلة الشائعة"],"fr":["À propos d’ASLAN","Vision","Mission","Activités","Projets","Réalisations","Actualités","Questions fréquentes"],"en":["About ASLAN","Vision","Mission","Activities","Projects","Portfolio","News","Frequently asked questions"],"es":["Acerca de ASLAN","Visión","Misión","Actividades","Proyectos","Trabajos","Noticias","Preguntas frecuentes"],"de":["Über ASLAN","Vision","Mission","Tätigkeiten","Projekte","Referenzen","Neuigkeiten","Häufige Fragen"],"pt":["Sobre a ASLAN","Visão","Missão","Atividades","Projetos","Portefólio","Notícias","Perguntas frequentes"]};
const marketCatalogHeadings = {ar:'اكتشف منتجات السوق',fr:'Produits du marché',en:'Explore market products',es:'Productos del mercado',de:'Marktprodukte entdecken',pt:'Produtos do mercado'};
const academyCatalogHeadings = {ar:'الدورات الإلكترونية والتكوين',fr:'Cours en ligne et formations',en:'Online courses and training',es:'Cursos en línea y formación',de:'Online-Kurse und Weiterbildung',pt:'Cursos online e formação'};
const partnerHeadings = {ar:'الشراكات والتعاون',fr:'Partenariats et collaboration',en:'Partnerships and collaboration',es:'Alianzas y colaboración',de:'Partnerschaften und Zusammenarbeit',pt:'Parcerias e colaboração'};
const partnerFormLabels = {
  ar:['اسم جهة الاتصال','رقم الهاتف','البريد الإلكتروني (اختياري)','اسم الشركة أو المؤسسة','مجال الشراكة','تفاصيل الطلب'],
  fr:['Nom du contact','Téléphone','E-mail (facultatif)','Nom de l’entreprise ou organisation','Type de partenariat','Détails de la demande'],
  en:['Contact name','Phone number','Email (optional)','Company or organization','Partnership type','Request details'],
  es:['Nombre de contacto','Teléfono','Correo electrónico (opcional)','Empresa u organización','Tipo de colaboración','Detalles de la solicitud'],
  de:['Kontaktperson','Telefonnummer','E-Mail (optional)','Unternehmen oder Organisation','Art der Partnerschaft','Anfragedetails'],
  pt:['Nome do contacto','Telefone','E-mail (opcional)','Empresa ou organização','Tipo de parceria','Detalhes do pedido'],
};
const partnerTypeLabels = {
  ar:['توريد','تكوين وتدريب','تنفيذ الخدمات','تعاون تجاري','فرص عمل وكفاءات','نوع آخر'],
  fr:['Fourniture','Formation','Prestations de services','Collaboration commerciale','Emploi et talents','Autre'],
  en:['Supply','Training','Service delivery','Business collaboration','Jobs and talent','Other'],
  es:['Suministro','Formación','Prestación de servicios','Colaboración comercial','Empleo y talento','Otro'],
  de:['Lieferung','Schulung','Dienstleistungen','Geschäftliche Zusammenarbeit','Stellen und Talente','Sonstiges'],
  pt:['Fornecimento','Formação','Prestação de serviços','Colaboração comercial','Emprego e talentos','Outro'],
};
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
    assert.equal(normalizePath(new URL(page.url()).pathname),route,'unexpected redirect '+code+':'+route);
    if(route==='/market') await page.waitForFunction(expected=>document.querySelector('#catalog-heading')?.textContent?.trim()===expected,marketCatalogHeadings[code],{timeout:15000});
    if(route==='/academy') await page.waitForFunction(expected=>document.querySelector('#courses-heading')?.textContent?.trim()===expected,academyCatalogHeadings[code],{timeout:15000});
    if(route==='/talent') await page.waitForFunction(expected=>document.querySelector('main h1')?.textContent?.trim()===expected,talentHeadings[code],{timeout:15000});
    if(route==='/company') {
      await page.waitForFunction(expected=>document.querySelector('main h1')?.textContent?.trim()===expected,companyHeadings[code],{timeout:15000});
      const headings=page.locator('main .grid.three .card h2');
      assert.equal(await headings.count(),8,'company sections count '+code);
      for(let i=0;i<8;i++) assert.equal((await headings.nth(i).textContent()).trim(),companySectionLabels[code][i],code+':company section '+i);
    }
    if(route==='/partners') await page.waitForFunction(expected=>document.querySelector('main h1')?.textContent?.trim()===expected,partnerHeadings[code],{timeout:15000});
    if(route==='/partners') {
      const form=page.locator('form.card');
      const fields=form.locator('label');
      assert.equal(await fields.count(),6,'partner form field count '+code);
      for(let i=0;i<6;i++) assert.equal(await fields.nth(i).evaluate(el=>el.firstChild?.textContent?.trim()),partnerFormLabels[code][i],code+':partner field '+i);
      const options=form.locator('select option');
      assert.equal(await options.count(),6,'partner type count '+code);
      for(let i=0;i<6;i++) assert.equal((await options.nth(i).textContent()).trim(),partnerTypeLabels[code][i],code+':partner type '+i);
    }
    const nav=page.locator('nav.shell-nav a');
    assert.equal(await nav.count(),8,'navigation count '+code+':'+route);
    for(let n=0;n<8;n++){
      assert.equal((await nav.nth(n).textContent()).trim(),labels[code][n],code+':'+route+':'+n);
      assert.equal(normalizePath(new URL(await nav.nth(n).getAttribute('href'),origin).pathname),routes[n]);
    }
  }
  let checked=0;
  for(const code of langs){
    await page.goto(origin+'/',{waitUntil:'domcontentloaded'});
    await page.locator(picker).selectOption(code);
    await page.waitForFunction(expected=>document.documentElement.lang===expected,code);
    for(const route of routes){await verify(code,route);checked++;}
    // Exercise an actual navigation click, not just direct URL visits and href assertions.
    // Next.js trailingSlash renders /market/; the link's position and target were verified above.
    await page.locator('nav.shell-nav a').nth(1).click();
    await page.waitForURL(url=>normalizePath(url.pathname)==='/market');
    await page.waitForFunction(expected=>document.documentElement.lang===expected &&
      document.documentElement.dir===(expected==='ar'?'rtl':'ltr') &&
      localStorage.getItem('aslan-language')===expected,code);
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(expected=>document.documentElement.lang===expected && document.querySelector('select[aria-label="Language / اللغة"]')?.value===expected,code);
  }
  // Real browser submission acceptance with a mocked local API: no external writes.
  await page.goto(origin+'/partners',{waitUntil:'domcontentloaded'});
  await page.locator(picker).selectOption('en');
  const partnerForm=page.locator('form.card');
  await partnerForm.locator('input[autocomplete="name"]').fill('Example Partner');
  await partnerForm.locator('input[autocomplete="tel"]').fill('0550000000');
  await partnerForm.locator('input[autocomplete="organization"]').fill('Example Company');
  await partnerForm.locator('textarea').fill('Test partnership request');
  await page.route('**/api/partners/applications', route=>route.fulfill({
    status:500,contentType:'application/json',body:JSON.stringify({error:'mock failure'}),
  }));
  await partnerForm.locator('button[type="submit"]').click();
  await page.getByRole('status').waitFor();
  await page.waitForFunction(()=>document.querySelector('[role="status"]')?.textContent==='Unable to save the request. It has not been confirmed.');
  await page.unroute('**/api/partners/applications');
  const mockId='11111111-1111-4111-8111-111111111111';
  await page.route('**/api/partners/applications', route=>route.fulfill({
    status:201,contentType:'application/json',body:JSON.stringify({application:{id:mockId,status:'submitted'}}),
  }));
  await partnerForm.locator('button[type="submit"]').click();
  await page.waitForFunction(id=>document.querySelector('[role="status"]')?.textContent?.includes(id),mockId);
  await page.locator(picker).selectOption('ar');
  await page.waitForFunction(id=>document.querySelector('[role="status"]')?.textContent?.includes('تم حفظ طلب الشراكة') &&
    document.querySelector('[role="status"]')?.textContent?.includes(id),mockId);
  await page.unroute('**/api/partners/applications');
  const second=await context.newPage();
  await second.goto(origin+'/',{waitUntil:'domcontentloaded'});
  await second.locator(picker).waitFor();
  // A same-value selection does not emit a storage event: verify two real cross-tab changes.
  await page.locator(picker).selectOption('en');
  await second.waitForFunction(()=>document.documentElement.lang==='en' && document.documentElement.dir==='ltr' &&
    document.querySelector('select[aria-label="Language / اللغة"]')?.value==='en',null,{timeout:15000});
  await page.locator(picker).selectOption('ar');
  await second.waitForFunction(()=>document.documentElement.lang==='ar' && document.documentElement.dir==='rtl' &&
    document.querySelector('select[aria-label="Language / اللغة"]')?.value==='ar',null,{timeout:15000});
  console.log('ASLAN_BROWSER_LOCALE_PASS cases='+checked+' persistence=6 navigation_click=6 cross_tab_changes=2 rtl_ltr=1 partner_form=6 submit_mock=2');
} finally {
  await browser?.close();
  child.kill('SIGTERM');
  await new Promise(resolve=>fixture.close(resolve));
}
