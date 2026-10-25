#!/usr/bin/env node
/** Audits untranslated Arabic UI literals in Next.js pages. Run with --strict to fail CI. */
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../../src/app');
const ar=/[\u0600-\u06ff]/;
const extensions=/\.(tsx|jsx)$/;
const hits=[];
function walk(dir){
 for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
  const full=path.join(dir,entry.name);
  if(entry.isDirectory())walk(full);
  else if(extensions.test(entry.name)&&!entry.name.endsWith('.test.tsx')){
   const lines=fs.readFileSync(full,'utf8').split(/\r?\n/);
   lines.forEach((line,index)=>{
    if(ar.test(line)&&(/>[^<]*[\u0600-\u06ff]/.test(line)||/['"`][^'"`]*[\u0600-\u06ff]/.test(line))){
      hits.push({file:path.relative(root,full),line:index+1,text:line.trim().slice(0,180)});
    }
   });
  }
 }
}
walk(root);
console.log(JSON.stringify({audit:'ASLAN visible Arabic source literals',count:hits.length,files:new Set(hits.map(h=>h.file)).size,hits},null,2));
if(process.argv.includes('--strict')&&hits.length)process.exitCode=1;
