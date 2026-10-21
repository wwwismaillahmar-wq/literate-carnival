#!/usr/bin/env node
/**
 * TUS protocol acceptance against an explicitly supplied staging URL.
 * Usage: TUS_TEST_ENDPOINT=https://staging.example/files/ TUS_TEST_TOKEN=... node scripts/test-tus-resume.mjs 2147483648
 * Never point this at production without an approved isolated test bucket.
 */
import { randomBytes, createHash } from 'node:crypto';
import { open, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const endpoint = process.env.TUS_TEST_ENDPOINT;
const token = process.env.TUS_TEST_TOKEN;
const bytes = Number(process.argv[2] || 0);
if (!endpoint || !/^https:\/\//.test(endpoint) || !token ||
    ![2 * 1024 ** 3, 8 * 1024 ** 3].includes(bytes)) {
  console.error('Requires HTTPS TUS_TEST_ENDPOINT, TUS_TEST_TOKEN and size 2147483648 or 8589934592');
  process.exit(2);
}
const headers = { 'Tus-Resumable': '1.0.0', Authorization: 'Bearer ' + token };
const created = await fetch(endpoint, {
  method: 'POST', headers: { ...headers, 'Upload-Length': String(bytes), 'Upload-Metadata': 'filename ' + Buffer.from('acceptance.bin').toString('base64') },
});
if (created.status !== 201) throw Error('TUS create failed: ' + created.status);
const location = created.headers.get('location');
if (!location) throw Error('Missing upload location');
const uploadUrl = new URL(location, endpoint);
if (uploadUrl.origin !== new URL(endpoint).origin) throw Error('Cross-origin upload URL rejected');
const seed = randomBytes(32);
function chunkAt(offset, length) {
  const out = Buffer.allocUnsafe(length);
  let at = 0;
  while (at < length) {
    const digest = createHash('sha256').update(seed).update(String(Math.floor((offset + at) / 32))).digest();
    const within = (offset + at) % 32;
    const n = Math.min(32 - within, length - at);
    digest.copy(out, at, within, within + n);
    at += n;
  }
  return out;
}
async function offset() {
  const r = await fetch(uploadUrl, { method: 'HEAD', headers });
  if (!r.ok) throw Error('TUS HEAD failed ' + r.status);
  const n = Number(r.headers.get('upload-offset'));
  if (!Number.isSafeInteger(n) || n < 0 || n > bytes) throw Error('Invalid upload offset');
  return n;
}
async function patch(start, data) {
  const r = await fetch(uploadUrl, { method: 'PATCH', headers: { ...headers, 'Upload-Offset': String(start), 'Content-Type': 'application/offset+octet-stream' }, body: data });
  if (r.status !== 204) throw Error('TUS PATCH failed ' + r.status);
  return Number(r.headers.get('upload-offset'));
}
let current = await offset();
const chunkSize = 8 * 1024 * 1024;
let disconnected = false;
while (current < bytes) {
  const next = Math.min(chunkSize, bytes - current);
  if (!disconnected && current >= chunkSize) {
    // Simulate a client restart: discard local offset and rediscover it via HEAD.
    const recovered = await offset();
    if (recovered !== current) throw Error('Resume offset mismatch');
    disconnected = true;
    console.log('RESUME_OFFSET_VERIFIED', recovered);
  }
  const updated = await patch(current, chunkAt(current, next));
  if (updated !== current + next) throw Error('Unexpected PATCH offset');
  current = updated;
  if (current % (256 * 1024 ** 2) === 0) console.log('PROGRESS', current, '/', bytes);
}
if (!disconnected || await offset() !== bytes) throw Error('Final offset or resume check failed');
console.log('TUS_TRANSFER_COMPLETE', bytes, 'NOTE: server-side checksum and quarantine verification still required');
