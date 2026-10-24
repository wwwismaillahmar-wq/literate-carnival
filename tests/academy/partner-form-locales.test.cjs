const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.resolve(__dirname, '../..');
const source = fs.readFileSync(path.join(root, 'src/lib/i18n/partner-form.ts'), 'utf8');
const component = fs.readFileSync(path.join(root, 'src/components/PartnerApplicationForm.tsx'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const exports = {};
vm.runInNewContext(compiled, { exports, module: { exports } });
const { partnerFormCopy, partnershipTypes } = exports;
const languages = ['ar','fr','en','es','de','pt'];
const fields = ['contactName','phone','email','organizationName','partnershipType','message'];
const statuses = ['submit','saving','success','failed','networkError'];

test('partner form has complete six-language fields, options and status messages', () => {
  assert.deepEqual(Object.keys(partnerFormCopy).sort(), languages.slice().sort());
  assert.equal(partnershipTypes.length, 6);
  for (const code of languages) {
    const t = partnerFormCopy[code];
    for (const key of [...fields,...statuses]) {
      assert.equal(typeof t[key], 'string', code + ':' + key);
      assert.ok(t[key].trim().length > 0, code + ':' + key + ' empty');
    }
    assert.deepEqual(Object.keys(t.types).sort(), Array.from(partnershipTypes).sort(), code + ': types');
    for (const type of partnershipTypes) assert.ok(t.types[type].trim(), code + ':' + type);
    if (code !== 'ar') assert.notEqual(t.contactName, partnerFormCopy.ar.contactName, 'Arabic fallback in '+code);
  }
});

test('form uses the active locale and preserves stable API values and confirmation semantics', () => {
  assert.match(component, /useAslanLanguage\(\)/);
  assert.match(component, /partnerFormCopy\[language\]/);
  assert.match(component, /partnershipTypes\.map/);
  assert.match(component, /JSON\.stringify\(\{ contactName, phone, email, organizationName, partnershipType, message \}\)/);
  assert.match(component, /!response\.ok \|\| !result\?\.application\?\.id/);
  assert.match(component, /setStatus\(\{ kind: 'success', id: result\.application\.id \}\)/);
  assert.match(component, /role="status" aria-live="polite"/);
});
