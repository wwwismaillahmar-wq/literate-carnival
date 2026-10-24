const fs=require('node:fs');
const assert=require('node:assert/strict');
const read=(path)=>fs.readFileSync(path,'utf8');
const selector=read('src/components/LanguageSelector.tsx');
const locale=read('src/components/AslanLocale.tsx');
const navbar=read('src/components/Navbar.tsx');
const academy=read('src/components/academy/AcademyCatalog.tsx');
for(const code of ['ar','fr','en','es','de','pt']){
 assert.match(selector,new RegExp('(?:^|\\n)'+code+':\\s*\\['), 'Missing nav labels: '+code);
 assert.match(locale,new RegExp('(?:^|\\n)\\s*'+code+':\\s*\\{'), 'Missing locale: '+code);
 assert.match(academy,new RegExp('(?:^|\\n)\\s*'+code+':\\s*\\{'), 'Missing academy copy: '+code);
}
assert.match(navbar,/<LocalePicker/);
assert.match(navbar,/useAslanLanguage/);
assert.match(locale,/localStorage\.setItem\('aslan-language'/);
assert.match(locale,/document\.documentElement\.dir/);
assert.match(locale,/aslan:language-change/);
assert.match(academy,/copy\.noMatches/);
assert.match(academy,/copy\.noCourses/);

// Reject untranslated training fields instead of merely checking that locale blocks exist.
const fields=read('src/lib/academy/catalog.ts');
const ids=[...fields.matchAll(/\{ id: '([a-z]+)', title:/g)].map(match=>match[1]);
assert.equal(ids.length,5,'Unexpected academy field count: update locale acceptance checks');
const fieldBlock=academy.slice(academy.indexOf('const fieldNames:'));
for(const code of ['ar','fr','en','es','de','pt']){
 const line=fieldBlock.split('\\n').find(line=>line.trimStart().startsWith(code+':{'));
 assert.ok(line,'Missing academy field locale '+code);
 for(const id of ids) assert.ok(line.includes(id+':'),'Missing academy field '+id+' in '+code);
}

console.log('PASS: 6 locale dictionaries, navbar, academy, persisted direction and synchronization');
