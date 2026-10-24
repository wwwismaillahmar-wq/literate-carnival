#!/usr/bin/env node
// Verify a stored local object after TUS finalization. This does NOT attest to
// remote Contabo uploads, upload authorization or any live storage deployment.
import {createHash,timingSafeEqual} from 'node:crypto';
import {constants} from 'node:fs';
import {open,lstat} from 'node:fs/promises';
import {resolve} from 'node:path';

const sameIdentity=(a,b)=>a.dev===b.dev && a.ino===b.ino;
const sameVersion=(a,b)=>sameIdentity(a,b) && a.size===b.size &&
  a.mtimeNs===b.mtimeNs && a.ctimeNs===b.ctimeNs;

async function main(){
  const [input,hex,expectedSize]=process.argv.slice(2);
  if(!input||!/^[a-f0-9]{64}$/i.test(hex??'')||
     (expectedSize!==undefined&&(!/^(0|[1-9][0-9]*)$/.test(expectedSize)||
      !Number.isSafeInteger(Number(expectedSize)))))
    throw Error('USAGE: verify-upload-sha256.mjs LOCAL_FILE SHA256_HEX [EXPECTED_BYTES]');
  if(typeof constants.O_NOFOLLOW!=='number') throw Error('NOFOLLOW_NOT_SUPPORTED');
  const file=resolve(input),initial=await lstat(file,{bigint:true});
  if(!initial.isFile()||initial.isSymbolicLink())throw Error('FILE_NOT_REGULAR');
  // O_NOFOLLOW closes the symlink-swap window between lstat and open.
  const handle=await open(file,constants.O_RDONLY|constants.O_NOFOLLOW);
  try {
    const before=await handle.stat({bigint:true});
    if(!before.isFile()||!sameIdentity(initial,before))throw Error('FILE_CHANGED_BEFORE_READ');
    if(expectedSize!==undefined&&before.size!==BigInt(expectedSize))throw Error('SIZE_MISMATCH');
    const hash=createHash('sha256');
    let count=0n;
    for await(const chunk of handle.createReadStream({autoClose:false,highWaterMark:1024*1024})){
      hash.update(chunk);count+=BigInt(chunk.length);
    }
    const after=await handle.stat({bigint:true});
    const current=await lstat(file,{bigint:true});
    if(count!==before.size||!sameVersion(before,after)||!sameVersion(before,current))
      throw Error('FILE_CHANGED_DURING_READ');
    const actual=hash.digest();
    if(!timingSafeEqual(actual,Buffer.from(hex,'hex')))throw Error('SHA256_MISMATCH');
    console.log(JSON.stringify({verified:true,algorithm:'sha256',bytes:Number(count),sha256:actual.toString('hex')}));
  } finally {await handle.close();}
}
main().catch(error=>{console.error('UPLOAD_INTEGRITY_FAILURE:',error.message);process.exitCode=1;});
