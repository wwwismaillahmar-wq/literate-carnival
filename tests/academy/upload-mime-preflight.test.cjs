const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

function load(relative, overrides = {}) {
  const file = path.resolve(__dirname, '../..', relative);
  const loaded = new Module(file, module);
  loaded.filename = file;
  loaded.paths = module.paths;
  const original = loaded.require.bind(loaded);
  loaded.require = name => name in overrides ? overrides[name] : original(name);
  loaded._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, resolveJsonModule: true } }).outputText, file);
  return loaded.exports;
}
const policy = load('src/lib/academy/resource-policy.ts');
const config = load('src/lib/academy/contabo-storage.ts', { '@/lib/supabase/server': {} });
const route = load('src/app/api/academy/upload-intent/route.ts', {
  '@/lib/academy/resource-policy': policy,
  '@/lib/academy/contabo-storage': config,
  'next/server': { NextResponse: { json: (value, options) => Response.json(value, options) } },
  '@/lib/supabase/server': { createClient: async () => db },
});
const lessonId = '5dd358cf-6c5c-4b6b-8901-3f6e2d33f7c0';
let inserted;
const db = {
  auth: { getUser: async () => ({ data: { user: { id: 'owner' } } }) },
  rpc: async () => ({ data: true }),
  from: name => name === 'academy_lessons'
    ? { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: lessonId, academy_modules: { course_id: 'course' } } }) }) }) }
    : { insert: value => { inserted = value; return { select: () => ({ single: async () => ({ data: { id: value.id } }) }) }; } },
};
function request(fileName, sizeBytes) { return new Request('https://academy.example/api/academy/upload-intent', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://academy.example' }, body: JSON.stringify({ lessonId, fileName, sizeBytes }) }); }

test('all 37 extensions have one canonical MIME mapping and accept the exact 8 GiB boundary', () => {
  const extensions = Object.values(policy.ACADEMY_FILE_CATEGORIES).flat();
  assert.equal(extensions.length, 37);
  assert.deepEqual(Object.keys(policy.ACADEMY_MIME_TYPES).sort(), [...extensions].sort());
  for (const extension of extensions) {
    assert.ok(policy.ACADEMY_MIME_TYPES[extension]);
    assert.equal(policy.validateAcademyUploadMetadata('lesson.' + extension, 8589934592).accepted, true);
  }
  assert.equal(policy.validateAcademyUploadMetadata('lesson.mp4', 8589934593).accepted, false);
  assert.equal(policy.validateAcademyUploadMetadata('lesson.exe', 1).accepted, false);
  assert.equal(policy.validateAcademyUploadMetadata('a'.repeat(180) + '.pdf', 1).accepted, false);
});

test('8 GiB intent targets Contabo without any Supabase Storage 50 MiB preflight', async () => {
  const old = process.env.ACADEMY_UPLOAD_BASE_URL;
  process.env.ACADEMY_UPLOAD_BASE_URL = 'https://uploads.example';
  try {
    const response = await route.POST(request('lesson.mp4', 8589934592));
    assert.equal(response.status, 200);
    const intent = await response.json();
    assert.equal(intent.maxBytes, 8589934592);
    assert.equal(intent.backend, 'contabo');
    assert.equal(inserted.storage_backend, 'contabo');
    assert.equal(inserted.object_path, lessonId + '/' + intent.assetId);
    assert.equal(intent.endpoint, 'https://uploads.example/files/' + intent.assetId);
    assert.equal(intent.bucket, undefined);
  } finally { if (old === undefined) delete process.env.ACADEMY_UPLOAD_BASE_URL; else process.env.ACADEMY_UPLOAD_BASE_URL = old; }
});

test('oversize and missing/unsafe gateway config fail before pending insertion', async () => {
  const old = process.env.ACADEMY_UPLOAD_BASE_URL;
  try {
    inserted = undefined;
    process.env.ACADEMY_UPLOAD_BASE_URL = 'http://unsafe.example';
    assert.equal((await route.POST(request('lesson.mp4', 8589934593))).status, 400);
    assert.equal((await route.POST(request('lesson.mp4', 10))).status, 503);
    assert.equal(inserted, undefined);
  } finally { if (old === undefined) delete process.env.ACADEMY_UPLOAD_BASE_URL; else process.env.ACADEMY_UPLOAD_BASE_URL = old; }
});
