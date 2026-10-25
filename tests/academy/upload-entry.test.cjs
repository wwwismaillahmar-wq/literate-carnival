const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

function component(name) {
  const file = path.resolve(__dirname, '../../src/components/admin', name + '.tsx');
  const loaded = new Module(file, module); loaded.filename = file; loaded.paths = module.paths;
  const original = loaded.require.bind(loaded);
  loaded.require = name => {
    if (name === '@/lib/supabase/client') return { createClient: () => ({}) };
    if (name === '@/components/AslanLocale') return { useAslanLanguage: () => ({ language: 'ar' }) };
    if (name === '@/lib/uploads/tus-response') return { parseTusOffset: () => 0, recoverTusOffset: async () => 0 };
    if (name === '@/lib/i18n/academy-assets' || name === '@/lib/i18n/academy-upload') {
      const dictionaryPath = path.resolve(__dirname, '../../src/lib/i18n', name.split('/').at(-1) + '.ts');
      const dictionary = new Module(dictionaryPath, module);
      dictionary.filename = dictionaryPath;
      dictionary.paths = module.paths;
      dictionary._compile(ts.transpileModule(fs.readFileSync(dictionaryPath, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
      }).outputText, dictionaryPath);
      return dictionary.exports;
    }
    return original(name);
  };
  loaded._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, file);
  return loaded.exports[name];
}

test('lesson files expose one 8 GiB upload entry without the obsolete 50 MB form', () => {
  const html = renderToStaticMarkup(React.createElement('section', null,
    React.createElement(component('AcademyLessonAssets'), { lessonId: 'fixture' }),
    React.createElement(component('AcademyResumableUpload'), { lessonId: 'fixture' }),
  ));
  assert.equal((html.match(/type="file"/g) || []).length, 1);
  assert.match(html, /8 GiB/);
  assert.doesNotMatch(html, /50\s*(?:MB|MiB)/);
});
