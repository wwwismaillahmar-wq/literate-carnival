const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

function component(name, language='ar') {
  const file = path.resolve(__dirname, '../../src/components/admin', name + '.tsx');
  const loaded = new Module(file, module); loaded.filename = file; loaded.paths = module.paths;
  const original = loaded.require.bind(loaded);
  const dictionaryPath = path.resolve(__dirname, '../../src/lib/i18n/academy-assets.ts');
  const dictionary = new Module(dictionaryPath, module);
  dictionary._compile(ts.transpileModule(fs.readFileSync(dictionaryPath, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, dictionaryPath);
  const uploadCopyPath = path.resolve(__dirname, '../../src/lib/i18n/academy-upload.ts');
  const uploadCopy = new Module(uploadCopyPath, module);
  uploadCopy._compile(ts.transpileModule(fs.readFileSync(uploadCopyPath, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, uploadCopyPath);
  loaded.require = name => name === '@/lib/supabase/client' ? { createClient: () => ({}) }
    : name === '@/lib/uploads/tus-response' ? { parseTusOffset: () => 0, recoverTusOffset: async () => 0 }
    : name === '@/components/AslanLocale' ? { useAslanLanguage: () => ({ language }) }
    : name === '@/lib/i18n/academy-assets' ? dictionary.exports
    : name === '@/lib/i18n/academy-upload' ? uploadCopy.exports
    : original(name);
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

test('resumable uploader SSR renders all six languages with localized actions', () => {
  const headings = {
    ar: 'رفع ملف الدرس حتى 8 GiB (قابل للاستئناف)',
    fr: 'Téléverser un fichier de cours (8 Gio max., reprise possible)',
    en: 'Upload lesson file (up to 8 GiB, resumable)',
    es: 'Subir archivo de la lección (hasta 8 GiB, reanudable)',
    de: 'Lektionsdatei hochladen (bis 8 GiB, fortsetzbar)',
    pt: 'Carregar ficheiro da lição (até 8 GiB, retomável)',
  };
  for (const [language, heading] of Object.entries(headings)) {
    const html = renderToStaticMarkup(React.createElement(component('AcademyResumableUpload', language), { lessonId: 'fixture' }));
    assert.ok(html.includes(heading), language + ' heading');
    assert.ok(html.includes('type="file"'), language + ' input');
    if (language !== 'ar') assert.ok(!html.includes('>إيقاف مؤقت</button>'), language + ' Arabic fallback');
  }
});
