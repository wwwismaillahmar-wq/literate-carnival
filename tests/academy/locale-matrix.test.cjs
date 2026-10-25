const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const root = path.resolve(__dirname, '../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const locale = read('src/components/AslanLocale.tsx');
const core = read('src/lib/i18n/core.ts');
const selector = read('src/components/LanguageSelector.tsx');
const navbar = read('src/components/Navbar.tsx');
const languages = ['ar', 'fr', 'en', 'es', 'de', 'pt'];
const spaces = ['home', 'market', 'services', 'academy', 'partners', 'company', 'community', 'talent'];

function getDictionary(text, name, fileName) {
  const ast = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let result;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === name) {
      assert.ok(node.initializer && ts.isObjectLiteralExpression(node.initializer), name + ' must be an object');
      result = node.initializer;
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  assert.ok(result, 'Missing dictionary ' + name);
  return Object.fromEntries(result.properties.map(prop => [prop.name.getText(ast).replace(/^['"]|['"]$/g, ''), prop.initializer]));
}
test('six language dictionaries cover eight spaces with nonempty labels', () => {
  const source = ts.createSourceFile('locale.tsx', locale, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const groups = getDictionary(locale, 'translations', 'locale.tsx');
  for (const code of languages) {
    const group = groups[code];
    assert.ok(group && ts.isObjectLiteralExpression(group), 'Missing locale ' + code);
    const entries = Object.fromEntries(group.properties.map(p => [p.name.getText(source).replace(/^['"]|['"]$/g, ''), p.initializer]));
    for (const key of spaces) {
      const value = entries[key];
      assert.ok(value && ts.isStringLiteral(value) && value.text.trim(), 'Missing translation ' + code + ':' + key);
    }
  }
});
test('navigation arrays cover the eight spaces for all six languages', () => {
  const groups = getDictionary(selector, 'navLabels', 'selector.tsx');
  for (const code of languages) {
    assert.ok(groups[code] && ts.isArrayLiteralExpression(groups[code]), 'Missing nav labels ' + code);
    assert.equal(groups[code].elements.length, 8, 'Expected eight labels for ' + code);
    for (const label of groups[code].elements) assert.ok(ts.isStringLiteral(label) && label.text.trim());
  }
  for (const route of ['/', '/market', '/services', '/academy', '/partners', '/company', '/community', '/talent']) {
    assert.ok(navbar.includes("'" + route + "'"), 'Missing navigation route ' + route);
  }
  for (const key of spaces) assert.ok(navbar.includes("'" + key + "'"), 'Missing navigation key ' + key);
});
test('locale hook retains storage, direction, and cross-tab synchronization contracts', () => {
  assert.match(core, /LOCALE_STORAGE_KEY\s*=\s*'aslan-language'/);
  assert.match(core, /localStorage\.setItem\(LOCALE_STORAGE_KEY,\s*locale\)/);
  assert.match(locale, /localStorage\.getItem\(LOCALE_STORAGE_KEY\)/);
  assert.match(core, /document\.documentElement\.lang\s*=\s*locale/);
  assert.match(core, /document\.documentElement\.dir\s*=\s*localeDirection\(locale\)/);
  assert.match(core, /locale\s*===\s*'ar'\s*\?\s*'rtl'\s*:\s*'ltr'/);
  assert.match(core, /LOCALE_EVENT\s*=\s*'aslan:language-change'/);
  assert.match(core, /dispatchEvent\(new Event\(LOCALE_EVENT\)\)/);
  assert.match(locale, /LOCALE_EVENT\s+as\s+LANGUAGE_EVENT/);
  assert.match(locale, /persistLocale\(next\)/);
  assert.match(locale, /addEventListener\(LANGUAGE_EVENT,\s*sync\)/);
  assert.match(locale, /removeEventListener\(LANGUAGE_EVENT,\s*sync\)/);
  assert.match(locale, /addEventListener\('storage',\s*sync\)/);
  assert.match(locale, /removeEventListener\('storage',\s*sync\)/);
  assert.match(selector, /persistLocale\(next\)/);
  assert.match(selector, /addEventListener\(LOCALE_EVENT,\s*sync\)/);
});
