// Isolated local TUS transport contract. NOT a live Contabo or Supabase upload.
const test=require('node:test'),assert=require('node:assert/strict'),http=require('node:http');
const {createHash,randomUUID}=require('node:crypto');
const {mkdtempSync,openSync,writeSync,closeSync,readFileSync,rmSync}=require('node:fs');
const {tmpdir}=require('node:os'),{join}=require('node:path');
test('real 13 MiB TUS upload, pause/HEAD/resume, offsets, authentication and SHA-256',async t=>{
 const dir=mkdtempSync(join(tmpdir(),'aslan-tus-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
 const sessions=new Map(),CHUNK=6*1024*1024;
 const server=http.createServer(async(req,res)=>{
  res.setHeader('Tus-Resumable','1.0.0');
  if(req.headers.authorization!=='Bearer teacher-A'){res.writeHead(401).end();return;}
  if(req.method==='POST'&&req.url==='/files/'){
   const length=Number(req.headers['upload-length']);
   if(!Number.isSafeInteger(length)||length<=0||length>32*1024*1024){res.writeHead(413).end();return;}
   const id=randomUUID(),file=join(dir,id),fd=openSync(file,'w');closeSync(fd);
   sessions.set(id,{length,offset:0,file});res.writeHead(201,{Location:'/files/'+id,'Upload-Offset':'0'}).end();return;
  }
  const id=req.url?.match(/^\/files\/([a-f0-9-]+)$/)?.[1],s=sessions.get(id);
  if(!s){res.writeHead(404).end();return;}
  if(req.method==='HEAD'){res.writeHead(200,{'Upload-Offset':String(s.offset),'Upload-Length':String(s.length)}).end();return;}
  if(req.method!=='PATCH'){res.writeHead(405).end();return;}
  if(req.headers['content-type']!=='application/offset+octet-stream'){res.writeHead(415).end();return;}
  const claimed=Number(req.headers['upload-offset']);
  if(!Number.isSafeInteger(claimed)||claimed!==s.offset){res.writeHead(409).end();return;}
  const chunks=[];for await(const chunk of req)chunks.push(chunk);
  const bytes=Buffer.concat(chunks);
  if(s.offset+bytes.length>s.length){res.writeHead(413).end();return;}
  const fd=openSync(s.file,'r+');try{writeSync(fd,bytes,0,bytes.length,s.offset);}finally{closeSync(fd);}
  s.offset+=bytes.length;res.writeHead(204,{'Upload-Offset':String(s.offset)}).end();
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 t.after(()=>new Promise(resolve=>server.close(resolve)));
 const base='http://127.0.0.1:'+server.address().port;
 const headers={Authorization:'Bearer teacher-A','Tus-Resumable':'1.0.0'};
 const bytes=Buffer.alloc(13*1024*1024);
 for(let i=0;i<bytes.length;i++)bytes[i]=(i*17+11)&255;
 const hash=createHash('sha256').update(bytes).digest('hex');
 const created=await fetch(base+'/files/',{method:'POST',headers:{...headers,'Upload-Length':String(bytes.length)}});
 assert.equal(created.status,201);
 const url=new URL(created.headers.get('location'),base).toString();
 const patchHeaders=offset=>({...headers,'Upload-Offset':String(offset),'Content-Type':'application/offset+octet-stream'});
 let response=await fetch(url,{method:'PATCH',headers:patchHeaders(0),body:bytes.subarray(0,CHUNK)});
 assert.equal(response.status,204);
 response=await fetch(url,{method:'HEAD',headers:{Authorization:'Bearer teacher-B'}});
 assert.equal(response.status,401);
 response=await fetch(url,{method:'PATCH',headers:patchHeaders(0),body:Buffer.from('bad')});
 assert.equal(response.status,409);
 // Simulate client restart: obtain the offset only from the server.
 response=await fetch(url,{method:'HEAD',headers});assert.equal(response.status,200);
 let offset=Number(response.headers.get('upload-offset'));assert.equal(offset,CHUNK);
 while(offset<bytes.length){
  const end=Math.min(offset+CHUNK,bytes.length);
  response=await fetch(url,{method:'PATCH',headers:patchHeaders(offset),body:bytes.subarray(offset,end)});
  assert.equal(response.status,204);offset=Number(response.headers.get('upload-offset'));assert.equal(offset,end);
 }
 const stored=readFileSync(sessions.get(url.split('/').pop()).file);
 assert.equal(stored.length,bytes.length);
 assert.equal(createHash('sha256').update(stored).digest('hex'),hash);
});
