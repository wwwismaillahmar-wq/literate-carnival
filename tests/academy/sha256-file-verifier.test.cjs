const test=require('node:test'),assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process'),{createHash}=require('node:crypto');
const {mkdtempSync,writeFileSync,rmSync}=require('node:fs');
const {tmpdir}=require('node:os'),{join,resolve}=require('node:path');
const cli=resolve(__dirname,'../../scripts/verify-upload-sha256.mjs');
const run=(file,hash,size)=>spawnSync(process.execPath,[cli,file,hash,...(size===undefined?[]:[String(size)])],{encoding:'utf8'});
test('streaming SHA-256 validates real 13 MiB bytes and rejects bad digest/size',t=>{
 const dir=mkdtempSync(join(tmpdir(),'aslan-integrity-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
 const file=join(dir,'uploaded.bin'),chunk=Buffer.alloc(1024*1024);
 for(let i=0;i<chunk.length;i++)chunk[i]=(i*13+7)&255;
 const bytes=Buffer.concat(Array.from({length:13},()=>chunk));writeFileSync(file,bytes);
 const hash=createHash('sha256').update(bytes).digest('hex'),good=run(file,hash,bytes.length);
 assert.equal(good.status,0,good.stderr);assert.deepEqual(JSON.parse(good.stdout),{verified:true,algorithm:'sha256',bytes:bytes.length,sha256:hash});
 const badHash=run(file,'0'.repeat(64),bytes.length);assert.notEqual(badHash.status,0);assert.match(badHash.stderr,/SHA256_MISMATCH/);
 const badSize=run(file,hash,bytes.length+1);assert.notEqual(badSize.status,0);assert.match(badSize.stderr,/SIZE_MISMATCH/);
 const invalid=run(file,'invalid',bytes.length);assert.notEqual(invalid.status,0);assert.match(invalid.stderr,/USAGE/);
});
