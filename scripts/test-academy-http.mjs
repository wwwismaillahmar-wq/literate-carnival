import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3100'],{stdio:['ignore','pipe','pipe'],env:{...process.env,NEXT_PUBLIC_SUPABASE_URL:'https://example.supabase.co',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_ci_placeholder'}});
try{
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Server readiness timeout')),20000);child.stdout.on('data',chunk=>{if(chunk.toString().includes('Ready')){clearTimeout(timer);resolve();}});child.on('exit',code=>{clearTimeout(timer);reject(new Error('Server exited '+code));});});
 const paths=[['/account/academy/',307],['/academy/lessons/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/',307],['/api/academy/assets/',401],['/api/academy/resources/?assetId=bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',401],['/api/academy/assessments/submit/?id=bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',401]];
 for(const [path,status] of paths){
 const response=await fetch('http://localhost:3100'+path,{redirect:'manual',signal:AbortSignal.timeout(10000)});
 assert.equal(response.status,status,path);
 if(status===307)assert.ok(response.headers.get('location').startsWith('/login?next='));
 console.log('PASS',status,path);
 }
 const blocked=await fetch('http://localhost:3100/api/academy/assets/',{method:'POST',headers:{origin:'https://foreign.test','Content-Type':'application/json'},body:'{}'});
 assert.equal(blocked.status,403);console.log('PASS 403 cross-origin upload');
 const admission=await fetch('http://localhost:3100/api/academy/admissions/',{method:'POST',headers:{origin:'http://localhost:3100','Content-Type':'application/json'},body:'{}'});
 assert.equal(admission.status,401);console.log('PASS 401 anonymous admission');
}finally{child.kill('SIGTERM');}
