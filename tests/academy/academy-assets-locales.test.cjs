const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const source=fs.readFileSync('src/lib/i18n/academy-assets.ts','utf8');
const component=fs.readFileSync('src/components/admin/AcademyLessonAssets.tsx','utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const exports={};vm.runInNewContext(js,{exports,module:{exports}});
const copy=exports.academyAssetCopy;
test('lesson asset lifecycle copy covers six languages and all statuses',()=>{
 const langs=['ar','fr','en','es','de','pt'];
 assert.deepEqual(Object.keys(copy).sort(),langs.slice().sort());
 const fields=Object.keys(copy.ar).sort();
 assert.equal(fields.length,15);
 for(const lang of langs){
  assert.deepEqual(Object.keys(copy[lang]).sort(),fields,lang+' missing fields');
  for(const field of fields)assert.ok(copy[lang][field].trim(),lang+':'+field);
  if(lang!=='ar')assert.notEqual(copy[lang].heading,copy.ar.heading,lang+' Arabic fallback');
 }
});
test('academy asset list uses current language for status and actions',()=>{
 for(const token of ['useAslanLanguage()','academyAssetCopy[language]','t[asset.status','t.retryDelete','t.deleted','t.saved','t.open','t.empty'])assert.ok(component.includes(token),token);
 assert.doesNotMatch(component,/>فتح الملف<|>حذف الملف<|>ملفات الدرس<\/h4>/);
});
