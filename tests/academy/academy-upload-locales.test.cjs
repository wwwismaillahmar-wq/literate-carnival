const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const vm=require('node:vm');
const source=fs.readFileSync('src/lib/i18n/academy-upload.ts','utf8');
const component=fs.readFileSync('src/components/admin/AcademyResumableUpload.tsx','utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const exported={};vm.runInNewContext(js,{exports:exported,module:{exports:exported}});
const copy=exported.academyUploadCopy;
test('resumable uploader copy is complete for six locales',()=>{
 const langs=['ar','fr','en','es','de','pt'];
 assert.deepEqual(Object.keys(copy).sort(),langs.slice().sort());
 const keys=Object.keys(copy.ar).sort();
 assert.equal(keys.length,25);
 for(const lang of langs){
  assert.deepEqual(Object.keys(copy[lang]).sort(),keys,lang+' missing keys');
  for(const key of keys)assert.ok(copy[lang][key].trim(),lang+':'+key);
  if(lang!=='ar')for(const key of ['heading','start','resume','pause','completed','sessionExpired'])
    assert.notEqual(copy[lang][key],copy.ar[key],lang+':'+key+' Arabic fallback');
 }
});
test('resumable upload displays localized status, actions and errors',()=>{
 for(const token of ['useAslanLanguage()','academyUploadCopy[language]','t[state]','t.resume','t.start','t.pause','t.completed','t.sessionExpired','t.gatewayUnavailable','t.progress','t.hint'])
   assert.ok(component.includes(token),token);
 assert.doesNotMatch(component,/>إيقاف مؤقت<|>رفع ملف الدرس حتى 8 GiB<|>جارٍ الرفع<|>استئناف الرفع<\/button>/);
});
