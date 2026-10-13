import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
const require=createRequire(import.meta.url);
function load(path,dependencies={}) {
 const output=ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const module={exports:{}};
 new Function('require','module','exports',output)(name=>dependencies[name]||require(name),module,module.exports);
 return module.exports;
}
const catalog=load('src/lib/academy/catalog.ts');
const validation=load('src/lib/academy/presentation-validation.ts',{'./catalog':catalog});
const guides=load('src/lib/guides.ts');
let count=0;
function test(name,fn){fn();count++;console.log('PASS',name);}
test('unpublished rows stay private',()=>{assert.equal(catalog.isPublished({status:'draft'}),false);assert.equal(catalog.isPublished({is_published:false,status:'published'}),false);assert.equal(catalog.isPublished({status:'published'}),true);});
test('no inferred price for missing price',()=>assert.equal(catalog.normalizeCourse({id:'a',title:'A',price_dzd:null}).price,null));
test('zero and numeric decimal prices remain exact',()=>{assert.equal(catalog.normalizeCourse({id:'a',price_dzd:0}).price,0);assert.equal(catalog.normalizeCourse({id:'a',price_dzd:'1200.50'}).price,1200.5);});
test('invalid prices do not appear as offers',()=>{for(const price of [-1,'invalid',Infinity])assert.equal(catalog.normalizeCourse({id:'a',price_dzd:price}).price,null);});
test('training category inference and admin override',()=>{assert.equal(catalog.normalizeCourse({id:'a',title:'التنجيد والديكور'}).field,'upholstery');assert.equal(catalog.normalizeCourse({id:'a',title:'التنجيد'},{field:'sewing'}).field,'sewing');});
test('safe cover excludes script and credential URLs',()=>{assert.equal(catalog.safeCover('javascript:alert(1)'), '');assert.equal(catalog.safeCover('https://user:pass@example.test/a'),'');assert.equal(catalog.safeCover('http://example.test/a'),'');assert.equal(catalog.safeCover('https://example.test/a'),'https://example.test/a');});
test('malformed presentation has safe fallback',()=>{assert.deepEqual(catalog.readPresentation('broken'),{});assert.deepEqual(catalog.readPresentation('[]'),{});});
test('filter combines title/category and search',()=>{const courses=[catalog.normalizeCourse({id:'a',title:'تنجيد أثاث'}),catalog.normalizeCourse({id:'b',title:'الكهرباء الصناعية'})];assert.equal(catalog.filterCourses(courses,'upholstery','أثاث').length,1);assert.equal(catalog.filterCourses(courses,'electrical','أثاث').length,0);assert.equal(catalog.filterCourses(courses,'','').length,2);});
test('marketing links stay internal',()=>{for(const href of ['https://evil.test','//evil.test','javascript:alert(1)','/\\\\evil.test'])assert.equal(validation.validAcademyLink(href),false);assert.equal(validation.validAcademyLink('/academy/join?course=abc'),true);});
test('presentation rejects wrong fields, types and covers',()=>{for(const value of ['[]','null','{"a":{"field":"fake"}}','{"a":{"featured":"yes"}}','{"a":{"cover":"javascript:alert(1)"}}','{"a":{"price":1}}'])assert.equal(validation.validPresentation(value),false);assert.equal(validation.validPresentation('{"a":{"field":"sewing","featured":true,"cover":""}}'),true);});
test('all seeded roles have responsibility and boundary guides',()=>{const keys=['super_admin','management','market_manager','services_manager','academy_manager','talent_manager','partner_manager','finance','instructor','support','customer','student','trainee','partner','company'];assert.deepEqual(guides.roleGuides.map(item=>item.key).sort(),keys.sort());assert.ok(guides.roleGuides.every(item=>item.tasks.length&&item.limits));});
test('guide distinguishes staff assignment from role',()=>assert.match(guides.roleGuides.find(item=>item.key==='instructor').limits,/الإسناد النشط/));
console.log(count+' experience checks passed');

let authUser=null;let allowed=false;let writes=[];
const db={auth:{getUser:async()=>({data:{user:authUser}})},rpc:async()=>({data:allowed,error:null}),from:()=>({upsert:rows=>{writes.push(rows);return {select:async()=>({data:rows,error:null})};}})};
const endpoint=load('src/app/api/platform/site-settings/route.ts',{'@/lib/supabase/server':{createClient:async()=>db},'@/lib/academy/presentation-validation':validation,'next/server':{NextResponse:{json:(body,options={})=>new Response(JSON.stringify(body),{status:options.status||200,headers:{'Content-Type':'application/json'}})}}});
async function patch(settings,origin='https://aslan.test') {return endpoint.PATCH(new Request('https://aslan.test/api/platform/site-settings',{method:'PATCH',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify({settings})}));}
async function apiTest(name,fn){await fn();count++;console.log('PASS',name);}
await apiTest('foreign-origin content update is blocked',async()=>assert.equal((await patch({academy_hero_title:'A'},'https://foreign.test')).status,403));
await apiTest('anonymous settings update is blocked',async()=>assert.equal((await patch({academy_hero_title:'A'})).status,401));
authUser={id:'admin-fixture'};
await apiTest('ordinary authenticated account cannot edit marketing',async()=>assert.equal((await patch({academy_hero_title:'A'})).status,403));
allowed=true;
await apiTest('invalid metadata prevents all writes',async()=>{writes=[];assert.equal((await patch({academy_hero_title:'Valid title',academy_catalog:'{"a":{"featured":"yes"}}'})).status,400);assert.equal(writes.length,0);});
await apiTest('external promotion URL is rejected',async()=>assert.equal((await patch({academy_promo_link:'https://outside.test'})).status,400));
await apiTest('valid admin content is public and attributed',async()=>{writes=[];assert.equal((await patch({academy_hero_title:'عنوان الأكاديمية',academy_catalog:'{"a":{"field":"electrical","featured":true}}'})).status,200);assert.equal(writes.length,1);assert.ok(writes[0].every(row=>row.updated_by==='admin-fixture'&&row.is_public===true));});
await apiTest('unknown key and array body are rejected',async()=>{assert.equal((await patch({unknown_key:'value'})).status,400);assert.equal((await patch(['value'])).status,400);});
console.log(count+' total experience and settings API checks passed');
