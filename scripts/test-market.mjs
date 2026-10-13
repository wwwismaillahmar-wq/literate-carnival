import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createRequire} from 'node:module';import ts from 'typescript';
const require=createRequire(import.meta.url);
function load(path,deps={}){const output=ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;const module={exports:{}};new Function('require','module','exports',output)(name=>deps[name]||require(name),module,module.exports);return module.exports;}
const catalog=load('src/lib/market/catalog.ts');const requests=load('src/lib/academy/requests.ts');let count=0;
function test(name,fn){fn();count++;console.log('PASS',name);}
const raw={id:1,slug:'item',name:'تنجيد كرسي',description:'أثاث وخامة',price_dzd:100,stock:5,category_id:1,category:{name:'الأثاث'},features:{minimum_order:2,specifications:{الخامة:'قماش'}},created_at:'2026-10-01'};
test('catalog uses actual price, stock, seller and minimum',()=>{const p=catalog.normalizeMarketProduct(raw);assert.equal(p.price,100);assert.equal(p.minimumOrder,2);assert.equal(p.storeId,'aslan');assert.equal(p.specifications.الخامة,'قماش');});
test('unknown price stays quote-only',()=>assert.equal(catalog.normalizeMarketProduct({...raw,price_dzd:null}).price,null));
test('bad images do not become active media',()=>{assert.equal(catalog.safeImage('javascript:alert(1)'),'');assert.equal(catalog.safeImage('https://user:pass@example.test/image'),'');assert.equal(catalog.safeImage('http://example.test/image'),'');});
test('storage media deduplicates with legacy images',()=>assert.equal(catalog.normalizeMarketProduct({...raw,images:['https://example.test/a','javascript:bad']},['https://example.test/a']).images.length,1));
test('seller identity is explicit rather than invented',()=>assert.equal(catalog.normalizeMarketProduct({...raw,features:{market_store_id:'seller-id'}}).storeId,'seller-id'));
test('valid product submission accepts quote pricing',()=>assert.ok(catalog.validateListing({name:'تنجيد كرسي',description:'',price:'',stock:0,minimumOrder:1,images:[]})));
test('invalid quantities and image schemes are rejected',()=>{assert.equal(catalog.validateListing({name:'xx',price:1,stock:1.5}),null);assert.equal(catalog.validateListing({name:'xx',price:1,stock:1,images:['javascript:alert(1)']}),null);});
test('reserved ASLAN store slug cannot be claimed',()=>assert.equal(catalog.validateStore({name:'Fake ASLAN',slug:'aslan'}),null));
test('invalid store logo is rejected',()=>assert.equal(catalog.validateStore({name:'Store',slug:'new-store',logoUrl:'javascript:bad'}),null));
test('combined text, category, stock and price filters work',()=>{const p=catalog.normalizeMarketProduct(raw);const f={query:'كرسي',category:'1',store:'aslan',availability:'stock',minimum:'50',maximum:'150',sort:'newest'};assert.equal(catalog.filterMarket([p],f).length,1);assert.equal(catalog.filterMarket([p],{...f,maximum:'80'}).length,0);assert.equal(catalog.filterMarket([p],{...f,store:'foreign'}).length,0);});
let user=null;let admin=false;let writes=0;
const db={auth:{getUser:async()=>({data:{user}})},rpc:async()=>({data:admin,error:null}),from:()=>({insert:()=>{writes++;return {select:()=>({single:async()=>({data:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'},error:null})})};}})};
const next={NextResponse:{json:(body,options={})=>new Response(JSON.stringify(body),{status:options.status||200,headers:{'Content-Type':'application/json'}})}};
const api=load('src/app/api/market/studio/route.ts',{'@/lib/supabase/server':{createClient:async()=>db},'@/lib/market/catalog':catalog,'@/lib/academy/requests':requests,'next/server':next});
async function call(method,body,origin='https://aslan.test'){return api[method](new Request('https://aslan.test/api/market/studio/',{method,headers:{origin,'Content-Type':'application/json'},body:JSON.stringify(body)}));}
async function apiTest(name,fn){await fn();count++;console.log('PASS',name);}
await apiTest('cross-origin seller submission is blocked',async()=>assert.equal((await call('POST',{},'https://foreign.test')).status,403));
await apiTest('guest cannot submit store or listing',async()=>assert.equal((await call('POST',{kind:'store'})).status,401));
user={id:'buyer-fixture'};
await apiTest('seller cannot approve store or listing through API',async()=>assert.equal((await call('PATCH',{kind:'store',id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',status:'approved'})).status,403));
await apiTest('invalid store does not reach database',async()=>{writes=0;assert.equal((await call('POST',{kind:'store',name:'x',slug:'bad',consent:true})).status,400);assert.equal(writes,0);});
await apiTest('valid store request is pending and owned',async()=>assert.equal((await call('POST',{kind:'store',name:'Fixture shop',slug:'fixture-shop',description:'',region:'',consent:true})).status,201));
const quote=load('src/app/api/market/quotes/route.ts',{'@/lib/supabase/server':{createClient:async()=>db},'@/lib/academy/requests':requests,'next/server':next});
await apiTest('quote rejects foreign origin',async()=>assert.equal((await quote.POST(new Request('https://aslan.test/api/market/quotes/',{method:'POST',headers:{origin:'https://foreign.test'},body:'{}'}))).status,403));
await apiTest('quote requires validated identity, quantity and consent',async()=>assert.equal((await quote.POST(new Request('https://aslan.test/api/market/quotes/',{method:'POST',headers:{origin:'https://aslan.test','Content-Type':'application/json'},body:JSON.stringify({name:'Test',phone:'0550000000',message:'Fixture message',quantity:0,type:'custom',consent:true})}))).status,400));
console.log(count+' market checks passed; mocked transport, no production writes');
