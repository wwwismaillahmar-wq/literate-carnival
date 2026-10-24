import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash, randomFillSync } from 'node:crypto';
import { createGateway, MAX_BYTES, CHUNK_BYTES, databaseAuthorizer } from '../../infra/uploads/academy-gateway.mjs';

const id = '5dd358cf-6c5c-4b6b-8901-3f6e2d33f7c0';
const other = '5dd358cf-6c5c-4b6b-8901-3f6e2d33f7c1';
const headers = { Authorization: 'Bearer owner', 'Tus-Resumable': '1.0.0' };
async function fixture(bytes) {
  const directory = await mkdtemp(path.join(tmpdir(), 'aslan-gateway-'));
  let asset = { id, owner_id: 'owner', file_size: bytes, file_name: 'test.txt', mime_type: 'text/plain', status: 'pending' };
  let server;
  const start = async () => {
    server = await createGateway({ directory, reserveBytes: 0, signingKey: 'a'.repeat(48), origins: ['https://academy.example'], authorize: async (req, assetId) => {
      if (req.headers.authorization !== 'Bearer owner' || assetId !== id || asset.status === 'archived') throw Object.assign(new Error('Denied'), { status: 403 });
      return asset;
    } });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    return 'http://127.0.0.1:' + server.address().port;
  };
  let base = await start();
  const stop = () => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); });
  return { directory, get base() { return base; }, setAsset: value => { asset = { ...asset, ...value }; }, restart: async () => { await stop(); base = await start(); }, close: async () => { await stop(); await rm(directory, { recursive: true, force: true }); } };
}

test('Contabo enforces ownership, maximum length and configured CORS before disk allocation', async () => {
  const f = await fixture(MAX_BYTES + 1);
  try {
    assert.equal((await fetch(f.base + '/files/' + id, { method: 'POST', headers: { ...headers, 'Upload-Length': String(MAX_BYTES + 1) } })).status, 413);
    assert.equal((await fetch(f.base + '/files/' + id, { method: 'HEAD' })).status, 403);
    f.setAsset({ file_size: 10 });
    assert.equal((await fetch(f.base + '/files/' + id, { method: 'POST', headers: { ...headers, Origin: 'https://evil.example', 'Upload-Length': '10' } })).status, 403);
    assert.equal((await fetch(f.base + '/files/' + other, { method: 'HEAD', headers })).status, 403);
    assert.equal((await fetch(f.base + '/files/' + id, { method: 'POST', headers: { ...headers, 'Upload-Length': '11' } })).status, 400);
    await assert.rejects(stat(path.join(f.directory, id + '.data')), { code: 'ENOENT' });
  } finally { await f.close(); }
});

test('offset conflicts, duplicate creation, restart, exact completion, signed download and revocation', async () => {
  const f = await fixture(10);
  const post = () => fetch(f.base + '/files/' + id, { method: 'POST', headers: { ...headers, 'Upload-Length': '10' } });
  const patch = (offset, data) => fetch(f.base + '/files/' + id, { method: 'PATCH', headers: { ...headers, 'Upload-Offset': String(offset), 'Content-Type': 'application/offset+octet-stream' }, body: data });
  try {
    assert.equal((await post()).status, 201);
    assert.equal((await patch(0, 'hello')).status, 204);
    assert.equal((await post()).headers.get('Upload-Offset'), '5');
    assert.equal((await patch(0, 'world')).status, 409);
    assert.equal((await patch(5, 'world!')).status, 413);
    assert.equal((await fetch(f.base + '/assets/' + id + '/verify', { method: 'POST', headers })).status, 409);
    await f.restart();
    assert.equal((await fetch(f.base + '/files/' + id, { method: 'HEAD', headers })).headers.get('Upload-Offset'), '5');
    assert.equal((await patch(5, 'world')).status, 204);
    const info = await (await fetch(f.base + '/assets/' + id + '/verify', { method: 'POST', headers })).json();
    assert.equal(info.sha256, createHash('sha256').update('helloworld').digest('hex'));
    const again = await (await fetch(f.base + '/assets/' + id + '/verify', { method: 'POST', headers })).json();
    assert.deepEqual(again, info);
    const signed = await (await fetch(f.base + '/assets/' + id + '/download-token', { method: 'POST', headers })).json();
    const download = await fetch(f.base + signed.path);
    assert.equal(await download.text(), 'helloworld');
    assert.match(download.headers.get('Content-Disposition'), /^attachment/);
    assert.equal((await fetch(f.base + signed.path.replace('token=', 'token=x'))).status, 403);
    f.setAsset({ status: 'archived' });
    assert.equal((await fetch(f.base + '/files/' + id, { method: 'HEAD', headers })).status, 403);
  } finally { await f.close(); }
});

test('database authorizer verifies identity, live permissions and RLS; no service-role key', async () => {
  const original = globalThis.fetch;
  let canManage = true;
  let currentStatus = 'pending';
  globalThis.fetch = async url => {
    if (url.includes('/auth/v1/user')) return Response.json({ id: 'owner' });
    if (url.includes('/academy_lesson_assets')) return Response.json([{ id, owner_id: 'owner', lesson_id: other, status: currentStatus, storage_backend: 'contabo' }]);
    if (url.includes('/academy_lessons')) return Response.json([{ module_id: other }]);
    return Response.json(canManage);
  };
  try {
    const authorize = databaseAuthorizer({ supabaseUrl: 'https://identity.example', publicKey: 'public' });
    await authorize({ headers: { authorization: 'Bearer valid' } }, id, 'patch');
    canManage = false;
    await assert.rejects(authorize({ headers: { authorization: 'Bearer valid' } }, id, 'patch'), { status: 403 });
    currentStatus = 'ready';
    await authorize({ headers: { authorization: 'Bearer valid' } }, id, 'download');
    await assert.rejects(authorize({ headers: {} }, id, 'download'), { status: 401 });
  } finally { globalThis.fetch = original; }
});

async function transfer(bytes) {
  const f = await fixture(bytes);
  const payload = randomFillSync(Buffer.alloc(CHUNK_BYTES));
  const expected = createHash('sha256');
  for (let n = 0; n < bytes; n += CHUNK_BYTES) expected.update(payload.subarray(0, Math.min(CHUNK_BYTES, bytes - n)));
  const requestHeaders = { ...headers, 'Content-Type': 'application/offset+octet-stream' };
  try {
    const created = await fetch(f.base + '/files/' + id, { method: 'POST', headers: { ...headers, 'Upload-Length': String(bytes) } });
    assert.equal(created.status, 201);
    let offset = 0;
    let interrupted = false;
    while (offset < bytes) {
      const segment = payload.subarray(offset % CHUNK_BYTES, Math.min(CHUNK_BYTES, offset % CHUNK_BYTES + bytes - offset));
      if (!interrupted && offset >= bytes / 2) {
        // Drop a live HTTP PATCH after partial bytes, not merely between requests.
        const partial = segment.subarray(0, Math.min(1024 * 1024, segment.length - 1));
        await new Promise(resolve => {
          const req = http.request(f.base + '/files/' + id, { method: 'PATCH', headers: { ...requestHeaders, 'Upload-Offset': String(offset), 'Content-Length': String(segment.length) } });
          req.on('error', () => resolve());
          req.write(partial, () => setTimeout(() => req.destroy(), 40));
        });
        for (let attempt = 0; attempt < 50; attempt++) {
          const head = await fetch(f.base + '/files/' + id, { method: 'HEAD', headers });
          if (head.ok) { offset = Number(head.headers.get('Upload-Offset')); break; }
          await new Promise(resolve => setTimeout(resolve, 20));
        }
        assert.ok(offset > bytes / 2 - CHUNK_BYTES);
        interrupted = true;
        await f.restart();
        const head = await fetch(f.base + '/files/' + id, { method: 'HEAD', headers });
        assert.equal(Number(head.headers.get('Upload-Offset')), offset);
        continue;
      }
      const response = await fetch(f.base + '/files/' + id, { method: 'PATCH', headers: { ...requestHeaders, 'Upload-Offset': String(offset) }, body: segment });
      assert.equal(response.status, 204, await response.text());
      offset = Number(response.headers.get('Upload-Offset'));
    }
    const result = await fetch(f.base + '/assets/' + id + '/verify', { method: 'POST', headers });
    assert.equal(result.status, 200);
    const info = await result.json();
    assert.equal(info.size, bytes);
    assert.equal(info.sha256, expected.digest('hex'));
    assert.equal((await stat(path.join(f.directory, id + '.data'))).size, bytes);
    console.log(JSON.stringify({ backend: 'contabo-filesystem', realBytes: bytes, interruptedPatch: interrupted, processRestart: true, sha256: info.sha256 }));
  } finally { await f.close(); }
}

test('real disk transfer survives mid-PATCH interruption and process restart', { timeout: 120000 }, () => transfer(24 * 1024 ** 2));
if (process.env.ASLAN_LARGE_TRANSFER === '1') {
  test('2 GiB real transfer, interrupted PATCH, restart and SHA-256', { timeout: 3600000 }, () => transfer(2 * 1024 ** 3));
  test('8 GiB real transfer, interrupted PATCH, restart and SHA-256', { timeout: 3600000 }, () => transfer(8 * 1024 ** 3));
}
