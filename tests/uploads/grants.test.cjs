const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('upload grant verifier checks HMAC and expiry before accepting', () => {
  const src = fs.readFileSync(path.join(__dirname, '../../src/lib/uploads/grants.ts'), 'utf8');
  assert.match(src, /createHmac\('sha256'/);
  assert.match(src, /timingSafeEqual/);
  assert.match(src, /expiresAt < Date\.now\(\)/);
  assert.match(src, /ASLAN_UPLOAD_GRANT_SECRET/);
});

test('TUS stays loopback-only in staging', () => {
  const src = fs.readFileSync(path.join(__dirname, '../../infra/uploads/docker-compose.yml'), 'utf8');
  assert.match(src, /127\.0\.0\.1:1080:8080/);
});
