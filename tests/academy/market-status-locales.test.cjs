const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const source=fs.readFileSync('src/lib/i18n/market-status.ts','utf8');
const component=fs.readFileSync('src/components/market/MarketCatalog.tsx','utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const exported={};vm.runInNewContext(js,{exports:exported,module:{exports:exported}});
const copy=exported.marketStatusCopy;
test('market feedback has complete six-language coverage',()=>{
 const langs=['ar','fr','en','es','de','pt'];
 assert.deepEqual(Object.keys(copy).sort(),langs.slice().sort());
 const fields=Object.keys(copy.ar).sort();
 assert.equal(fields.length,16);
 for(const lang of langs){
  assert.deepEqual(Object.keys(copy[lang]).sort(),fields,lang+' missing fields');
  for(const key of fields){assert.equal(typeof copy[lang][key],'string');assert.ok(copy[lang][key].trim(),lang+':'+key);}
  if(lang!=='ar')assert.notEqual(copy[lang].savedDescription,copy.ar.savedDescription,lang+' fallback');
 }
});
test('market catalog renders translated status and notices',()=>{
 for(const token of ['marketStatusCopy[language]','savedOnly?c.saved:c.title','s[notice]','s.resultUnit','s.chipQuery','s.compareSelected'])assert.ok(component.includes(token),token);
 assert.doesNotMatch(component,/منتجاتك المحفوظة|اخترت \{compared\.length\}|aria-label="فلاتر المنتجات"/);
});
