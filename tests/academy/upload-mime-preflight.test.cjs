const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const route = fs.readFileSync(path.join(__dirname, '../../src/app/api/academy/upload-intent/route.ts'), 'utf8');
const policy = fs.readFileSync(path.join(__dirname, '../../src/lib/academy/resource-policy.ts'), 'utf8');
const liveMimeTypes = [
  'video/mp4', 'video/webm', 'application/pdf',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg', 'image/png', 'image/webp', 'text/plain',
];

function parseAllowedMimeTypes() {
  const match = route.match(/const enabledStorageMimeTypes = new Set\(\[([\s\S]*?)\]\);/);
  assert.ok(match, 'expected a preflight allowlist');
  return [...match[1].matchAll(/'([^']+)'/g)].map(m => m[1]);
}

function parseMimeMap() {
  const match = route.match(/const mime: Record<string,string> = \{([\s\S]*?)\n  \};/);
  assert.ok(match, 'expected an extension-to-MIME map');
  return Object.fromEntries([...match[1].matchAll(/(\w+):'([^']+)'/g)].map(m => [m[1],m[2]]));
}

test('preflight MIME allowlist matches the reviewed live bucket snapshot', () => {
  assert.deepEqual(parseAllowedMimeTypes().sort(), [...liveMimeTypes].sort());
});

test('all enabled MIME extensions pass and unsupported formats are blocked', () => {
  const allowed = new Set(parseAllowedMimeTypes());
  const map = parseMimeMap();
  for (const ext of ['mp4','webm','pdf','pptx','docx','jpg','jpeg','png','webp','txt']) {
    assert.ok(allowed.has(map[ext]), ext + ' should pass');
  }
  for (const ext of ['mp3','wav','zip','html','mov','svg']) {
    assert.ok(!allowed.has(map[ext]), ext + ' should be blocked');
  }
});

test('unsupported MIME and oversize checks occur before pending asset insertion', () => {
  const mimeGuard = route.indexOf('if (!enabledStorageMimeTypes.has(mimeType))');
  const sizeGuard = route.indexOf('if (sizeBytes > currentStorageLimit)');
  const insert = route.indexOf(".from('academy_lesson_assets').insert(");
  assert.ok(mimeGuard > 0 && sizeGuard > mimeGuard && insert > sizeGuard);
  assert.match(route, /code: 'STORAGE_MIME_NOT_ENABLED'/);
  assert.match(route, /50 \* 1024 \* 1024/);
});

test('planned 37-extension and 8-GiB policy remain intact', () => {
  const categories = policy.match(/export const ACADEMY_FILE_CATEGORIES = \{([\s\S]*?)\} as const;/);
  assert.ok(categories);
  const extensions = [...categories[1].matchAll(/'([a-z0-9]+)'/g)].map(m => m[1]);
  assert.equal(extensions.length, 37);
  assert.match(policy, /ACADEMY_MAX_FILE_BYTES = 8 \* 1024 \*\* 3/);
});
