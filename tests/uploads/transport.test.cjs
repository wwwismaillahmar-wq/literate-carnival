const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
test('2 GiB and 8 GiB acceptance harness requires explicit HTTPS staging endpoint', () => {
  const src = fs.readFileSync(path.join(__dirname, '../../scripts/test-tus-resume.mjs'), 'utf8');
  assert.match(src, /TUS_TEST_ENDPOINT/);
  assert.match(src, /https:/);
  assert.match(src, /2147483648|2 \* 1024 \*\* 3/);
  assert.match(src, /8 \* 1024 \*\* 3/);
  assert.match(src, /method: 'HEAD'/);
  assert.match(src, /method: 'PATCH'/);
  assert.match(src, /RESUME_OFFSET_VERIFIED/);
});
