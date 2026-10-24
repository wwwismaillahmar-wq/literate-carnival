#!/usr/bin/env node
// Local-object post-TUS SHA-256 verifier. Run in an isolated worker after finalization.
// This tool verifies bytes, NOT upload authorization or Contabo deployment.
import {createHash,timingSafeEqual} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {lstat} from 'node:fs/promises';
import {resolve} from 'node:path';
async function main(){
 const [input,hex,expectedSize]=process.argv.slice(2);
 if(!input||!/^[a-f0-9]{64}$/i.test(hex??'')||(expectedSize!==undefined&&(!/^(0|[1-9][0-9]*)$/.test(expectedSize)||!Number.isSafeInteger(Number(expectedSize)))))
   throw Error('USAGE: verify-upload-sha256.mjs LOCAL_FILE SHA256_HEX [EXPECTED_BYTES]');
 const file=resolve(input),stat=await lstat(file);
 if(!stat.isFile()||stat.isSymbolicLink())throw Error('FILE_NOT_REGULAR');
 if(expectedSize!==undefined&&stat.size!==Number(expectedSize))throw Error('SIZE_MISMATCH');
 const hash=createHash('sha256');let count=0;
 for await(const chunk of createReadStream(file,{highWaterMark:1024*1024})){hash.update(chunk);count+=chunk.length;}
 if(count!==stat.size)throw Error('FILE_CHANGED_DURING_READ');
 const actual=hash.digest();
 if(!timingSafeEqual(actual,Buffer.from(hex,'hex')))throw Error('SHA256_MISMATCH');
 console.log(JSON.stringify({verified:true,algorithm:'sha256',bytes:count,sha256:actual.toString('hex')}));
}
main().catch(error=>{console.error('UPLOAD_INTEGRITY_FAILURE:',error.message);process.exitCode=1;});
