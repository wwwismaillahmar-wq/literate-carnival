const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '../..');
const source = fs.readFileSync(path.join(root, 'src/lib/i18n/company.ts'), 'utf8');
const component = fs.readFileSync(path.join(root, 'src/components/company/CompanyLanding.tsx'), 'utf8');
const server = fs.readFileSync(path.join(root, 'src/app/company/page.tsx'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const sandboxExports = {};
vm.runInNewContext(compiled, { exports: sandboxExports, module: { exports: sandboxExports } });
const { companyCopy, companySections } = sandboxExports;
const languages = ['ar','fr','en','es','de','pt'];
const sections = ['about','vision','mission','activity','project','portfolio','news','faq'];

test('company landing UI has complete six-language copy for all eight sections', () => {
  assert.deepEqual(Object.keys(companyCopy).sort(), languages.slice().sort());
  assert.deepEqual(Array.from(companySections), sections);
  for (const language of languages) {
    const t = companyCopy[language];
    for (const field of ['title','description','about','portfolio','asideTitle','asideBody','contact','empty','count']) {
      assert.equal(typeof t[field], 'string', language + ':' + field);
      assert.ok(t[field].trim(), language + ':' + field + ' is empty');
    }
    assert.ok(t.count.includes('{count}'), language + ': count placeholder');
    assert.deepEqual(Object.keys(t.sections).sort(), sections.slice().sort());
    for (const section of sections) assert.ok(t.sections[section].trim(), language + ':' + section);
    if (language !== 'ar') assert.notEqual(t.title, companyCopy.ar.title, language + ': Arabic fallback');
  }
});

test('company landing switches UI language without changing published-content access', () => {
  assert.match(component, /useAslanLanguage\(\)/);
  assert.match(component, /companyCopy\[language\]/);
  assert.match(component, /companySections\.map/);
  assert.match(component, /publishedTypes\.filter/);
  assert.match(server, /\.eq\('published', true\)/);
  assert.match(server, /CompanyLanding publishedTypes/);
});
