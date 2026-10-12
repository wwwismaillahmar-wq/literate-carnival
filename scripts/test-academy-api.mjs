// Execute real handlers; replace only the Supabase transport. SQL behavior is tested separately.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import {NextResponse} from 'next/server.js';
let database;
const context=vm.createContext({Request,Response,URL,crypto,console}),modules=new Map();
async function load(file){
 if(modules.has(file))return modules.get(file);
 const source=ts.transpileModule(await readFile(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
 const module=new vm.SourceTextModule(source,{context,identifier:file});modules.set(file,module);
 await module.link(async name=>{
 if(name==='@/lib/academy/requests')return load('src/lib/academy/requests.ts');
 const exports=name==='next/server'?{NextResponse}:name==='@/lib/supabase/server'?{createClient:async()=>database}:null;
 if(!exports)throw new Error('Unexpected import: '+name);
 return new vm.SyntheticModule(Object.keys(exports),function(){for(const[key,value]of Object.entries(exports))this.setExport(key,value);},{context});
 });return module;
}
const assets=await load('src/app/api/academy/assets/route.ts'),resources=await load('src/app/api/academy/resources/route.ts'),invoices=await load('src/app/api/academy/admissions/invoice/route.ts');
await assets.evaluate();await resources.evaluate();await invoices.evaluate();
const lessonId='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',assetId='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
let assertions=0;
function fake({signedIn=true,queries=[],rpcData=true,rpcError=null,storage={}}={}){
 const calls=[];
 database={
 auth:{getUser:async()=>({data:{user:signedIn?{id:assetId}:null}})},
 rpc:async(name,args)=>{calls.push(['rpc',name,args]);return{data:rpcData,error:rpcError};},
 from(table){
 const result=queries.shift();assert.ok(result,'Unexpected query: '+table);
 const chain=new Proxy({},{get(_target,method){
 if(method==='then')return Promise.resolve(result).then.bind(Promise.resolve(result));
 return(...args)=>{calls.push([table,method,args]);return chain;};}});return chain;
 },
 storage:{from:()=>new Proxy({},{get(_target,method){return async(...args)=>{
 calls.push(['storage',method,args]);assert.ok(method in storage,'Unexpected storage call: '+method);return storage[method];
 };}})},
 };return calls;
}
const row=data=>({data,error:null});
function request(method,body,origin='https://aslan.test'){
 return new Request('https://aslan.test/api/academy/assets?assetId='+assetId,{method,headers:{origin,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
}
async function status(response,expected){assert.equal(response.status,expected);assertions++;return response;}
fake({signedIn:false});await status(await assets.namespace.GET(request('GET')),401);
fake();await status(await assets.namespace.POST(request('POST',{},'https://foreign.test')),403);
await status(await assets.namespace.POST(request('POST',{lessonId,fileName:'x.pdf',mimeType:'application/pdf',fileSize:52428801})),400);
const body={lessonId,fileName:'x.pdf',mimeType:'application/pdf',fileSize:100};
fake({queries:[row({module_id:assetId})],rpcData:false});await status(await assets.namespace.POST(request('POST',body)),403);
fake({queries:[row({module_id:assetId}),row(null)],storage:{createSignedUploadUrl:row({token:'fixture-token'})}});
const prepared=await(await status(await assets.namespace.POST(request('POST',body)),201)).json();
assert.equal(prepared.bucket,'aslan-academy');assertions++;
assert.ok(prepared.path.startsWith(lessonId+'/'));assertions++;
const asset={lesson_id:lessonId,object_path:lessonId+'/'+assetId,status:'pending',file_size:100,mime_type:'application/pdf'};
let calls=fake({queries:[row(asset),row({module_id:assetId})],storage:{info:row({size:99,contentType:'application/pdf'})}});
await status(await assets.namespace.PATCH(request('PATCH',{assetId})),409);
assert.ok(!calls.some(call=>call[1]==='update'));assertions++;
fake({queries:[row(asset),row({module_id:assetId}),row({id:assetId,status:'ready'})],storage:{info:row({size:100,contentType:'application/pdf'})}});
await status(await assets.namespace.PATCH(request('PATCH',{assetId})),200);
calls=fake({queries:[row(asset),row({module_id:assetId}),{data:null,error:{message:'PUBLISH_REVIEW_REQUIRED'}}]});
await status(await assets.namespace.DELETE(request('DELETE')),403);assert.ok(!calls.some(call=>call[0]==='storage'));assertions++;
calls=fake({queries:[row(asset),row({module_id:assetId}),row(null)],storage:{remove:{data:null,error:{message:'fixture failure'}}}});
await status(await assets.namespace.DELETE(request('DELETE')),500);
assert.ok(calls.findIndex(call=>call[1]==='update')<calls.findIndex(call=>call[1]==='remove'));assertions++;
fake({queries:[row(null)]});await status(await resources.namespace.GET(request('GET')),403);
fake({queries:[row(asset)],storage:{createSignedUrl:row({signedUrl:'https://storage.test/signed-fixture'})}});
const download=await status(await resources.namespace.GET(request('GET')),307);
assert.equal(download.headers.get('Cache-Control'),'private, no-store');assertions++;
assert.equal(download.headers.get('Location'),'https://storage.test/signed-fixture');assertions++;
fake({signedIn:false});await status(await invoices.namespace.POST(request('POST',{applicationId:assetId})),401);
fake({rpcData:null,rpcError:{message:'FORBIDDEN'}});await status(await invoices.namespace.POST(request('POST',{applicationId:assetId})),403);
fake({rpcData:null,rpcError:{message:'COURSE_PRICE_REQUIRED'}});await status(await invoices.namespace.POST(request('POST',{applicationId:assetId})),409);
calls=fake({rpcData:{id:assetId,invoice_number:'FIXTURE-INVOICE'}});
await status(await invoices.namespace.POST(request('POST',{applicationId:assetId})),200);
assert.equal(calls[0][1],'issue_academy_admission_invoice');assertions++;
console.log('PASS:',assertions,'API assertions. Transport mocked; real upload/browser acceptance is separate.');
