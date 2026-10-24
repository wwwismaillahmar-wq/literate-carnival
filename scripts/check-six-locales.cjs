const fs=require('node:fs');
const assert=require('node:assert/strict');
const source=fs.readFileSync('src/components/LanguageSelector.tsx','utf8');
const navbar=fs.readFileSync('src/components/Navbar.tsx','utf8');
for(const locale of ['ar','fr','en','es','de','pt']){
 assert.match(source,new RegExp('(?:^|\\n)'+locale+':\\s*\\[','m'), 'Missing navigation dictionary '+locale);
}
assert.match(source,/localStorage\.setItem\('aslan-language'/);
assert.match(source,/document\.documentElement\.dir/);
assert.match(navbar,/<LanguageSelector/);
console.log('PASS: six navigation dictionaries, locale persistence, direction switch, navbar integration');
