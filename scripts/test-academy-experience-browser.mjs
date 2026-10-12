// Fixture-only browser checks. This script never writes to the production database.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.ASLAN_PLAYWRIGHT_MODULE||'playwright');
const courseId='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const fixtures=[
 {id:courseId,title:'تنجيد أثاث — اختبار العرض',description:'وصف برنامج لاختبار معرض الدورات فقط.',duration:'20 ساعة',price_dzd:1200,status:'published'},
 {id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',title:'الكهرباء الصناعية — اختبار العرض',description:'برنامج تقني لاختبار التصفية.',duration:'30 ساعة',price_dzd:null,status:'published'},
 {id:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',title:'الخياطة — اختبار العرض',description:'برنامج لاختبار الاختيار.',duration:'10 ساعات',price_dzd:0,status:'published'},
 {id:'dddddddd-dddd-4ddd-8ddd-dddddddddddd',title:'مسودة مخفية',status:'draft'},
];
const user={id:'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',email:'test@example.test',aud:'authenticated',role:'authenticated',created_at:new Date().toISOString()};
let queriesFail=false;let questionFailures=0;let admissionPosts=0;
const dbServer=createServer((request,response)=>{
 const url=new URL(request.url,'http://localhost');response.setHeader('Content-Type','application/json');
 if(url.pathname==='/auth/v1/user'){response.end(JSON.stringify(user));return;}
 if(url.pathname==='/rest/v1/courses'){if(queriesFail){response.statusCode=500;response.end(JSON.stringify({message:'Fixture catalog failure'}));return;}let rows=fixtures;const id=url.searchParams.get('id');if(id?.startsWith('eq.'))rows=rows.filter(row=>row.id===id.slice(3));response.end(JSON.stringify(request.headers.accept?.includes('vnd.pgrst.object')?rows[0]||null:rows));return;}
 if(url.pathname==='/rest/v1/site_settings'){const rows=[{setting_key:'academy_announcement_title',setting_value:'إعلان اختبار'},{setting_key:'academy_announcement_body',setting_value:'نص إعلان من إعدادات الإدارة.'}];const key=url.searchParams.get('setting_key');response.end(JSON.stringify(request.headers.accept?.includes('vnd.pgrst.object')?null: key?rows.filter(row=>row.setting_key===key.slice(3)):rows));return;}
 if(url.pathname==='/rest/v1/academy_admission_questions'){if(questionFailures>0){questionFailures--;response.statusCode=500;response.end(JSON.stringify({message:'Fixture question failure'}));return;}response.end('[]');return;}
 if(url.pathname==='/rest/v1/academy_admission_applications'&&request.method==='POST'){admissionPosts++;response.statusCode=201;response.end(JSON.stringify({id:'ffffffff-ffff-4fff-8fff-ffffffffffff',course_id:courseId,status:'submitted'}));return;}
 if(url.pathname.startsWith('/rest/v1/rpc/')){response.end(JSON.stringify(url.pathname.endsWith('has_role')?false:[]));return;}
 response.end('[]');
});
await new Promise(resolve=>dbServer.listen(3201,'127.0.0.1',resolve));
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','localhost','--port','3200'],{stdio:['ignore','pipe','pipe'],env:{...process.env,NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:3201',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_ci_placeholder'}});
let browser;
const origin='http://localhost:3200';let checks=0;
function pass(label){checks++;console.log('PASS',label);}
try{
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Server readiness timeout')),25000);child.stdout.on('data',chunk=>{if(chunk.toString().includes('Ready')){clearTimeout(timer);resolve();}});child.on('exit',code=>{clearTimeout(timer);reject(new Error('Server exited '+code));});});
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:1440,height:1000}});
 await context.addInitScript(()=>{sessionStorage.setItem('aslan-intro','1');});
 const page=await context.newPage();
 page.on('response',async response=>{if(response.url().includes('/api/academy/admissions') && response.status()>=400)console.log('ADMISSION FAILURE',response.status(),await response.text());});
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:1000});await page.goto(origin+'/academy');await page.waitForLoadState('networkidle');
  await page.getByRole('heading',{name:'الدورات الإلكترونية والتكوين'}).waitFor();
  assert.equal(await page.locator('#courses article').count(),3);assert.equal(await page.getByText('مسودة مخفية').count(),0);pass('published gallery at '+width+'px');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));pass('no horizontal overflow at '+width+'px');
  await page.getByRole('searchbox').fill('تنجيد');assert.equal(await page.locator('#courses article').count(),1);
  await page.getByRole('combobox',{name:'مجال التكوين'}).selectOption('electrical');assert.equal(await page.locator('#courses article').count(),0);
  await page.getByRole('button',{name:'عرض كل الدورات'}).click();assert.equal(await page.locator('#courses article').count(),3);pass('search, combined filter and reset at '+width+'px');
 }
 await page.goto(origin+'/academy?field=sewing#courses');assert.equal(await page.locator('#courses article').count(),1);pass('field portal filters gallery');
 await page.goto(origin+'/academy/join?course='+courseId);await page.getByRole('heading',{name:'سجّل الدخول لإكمال الطلب'}).waitFor();assert.match(await page.getByRole('link',{name:'تسجيل الدخول والمتابعة'}).getAttribute('href'),/next=/);pass('guest registration preserves selected course');
 await page.goto(origin+'/academy/'+courseId);await page.getByRole('link',{name:'اختيار العرض وطلب الالتحاق'}).waitFor();pass('course details lead to dedicated registration');
 await page.goto(origin);await page.getByRole('heading',{name:'مهارة جديدة. فرص أوسع.'}).waitFor();assert.equal(await page.locator('section[aria-labelledby="home-academy-heading"] article').count(),3);pass('homepage academy gallery');
 for(const path of ['/guides','/guides/management','/guides/rules']){await page.goto(origin+path);assert.ok(await page.locator('h1').count());assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));pass('guide renders and fits mobile '+path);}
 await page.goto(origin+'/guides/management');assert.equal(await page.locator('details').count(),15);await page.locator('#role-instructor summary').click();await page.getByText('الإسناد النشط إلى الدورة مطلوب؛',{exact:false}).waitFor();pass('all role guides expand and state boundaries');
 const now=Math.floor(Date.now()/1000);const token=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:user.id,exp:now+3600,aud:'authenticated',role:'authenticated'})).toString('base64url')+'.test';
 const session={access_token:token,refresh_token:'test-refresh',expires_in:3600,expires_at:now+3600,token_type:'bearer',user};
 await context.addCookies([{name:'sb-127-auth-token',value:'base64-'+Buffer.from(JSON.stringify(session)).toString('base64url'),url:origin}]);
 questionFailures=1;
 await page.goto(origin+'/academy/join?course='+courseId);
 await page.getByRole('heading',{name:'بيانات المتقدم وأسئلة القبول'}).waitFor();
 await page.getByRole('button',{name:'إعادة المحاولة'}).waitFor();
 assert.ok(await page.getByRole('button',{name:'إرسال طلب القبول',exact:true}).isDisabled());pass('question load failure blocks submission');
 await page.getByRole('button',{name:'إعادة المحاولة'}).click();await page.getByText('لا توجد أسئلة تأهيل إضافية',{exact:false}).waitFor();
 await page.getByLabel('الاسم الكامل').fill('متقدم الاختبار');await page.getByLabel('البريد الإلكتروني').fill('test@example.test');await page.getByLabel('رقم الهاتف').fill('0550000000');await page.getByRole('checkbox').check();
 await page.getByRole('button',{name:'إرسال طلب القبول',exact:true}).click();await page.getByRole('link',{name:'متابعة طلب القبول',exact:true}).waitFor();assert.equal(admissionPosts,1);assert.equal(await page.getByRole('button',{name:'إرسال طلب القبول',exact:true}).count(),0);pass('authenticated admission succeeds once and opens tracking');
 queriesFail=true;await page.goto(origin+'/academy');await page.getByRole('heading',{name:'تعذر تحميل الدورات'}).waitFor();assert.equal(await page.locator('#courses article').count(),0);pass('catalog failure displays error instead of invented courses');
 console.log(checks+' browser checks passed; fixture database only');
}finally{await browser?.close();child.kill('SIGTERM');await new Promise(resolve=>dbServer.close(resolve));}
