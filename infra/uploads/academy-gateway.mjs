import http from 'node:http';
import { constants as fsConstants } from 'node:fs';
import { lstat, mkdir, open, readFile, rename, rm, stat, statfs } from 'node:fs/promises';
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import { Transform } from 'node:stream';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const MAX_BYTES = 8 * 1024 ** 3;
export const CHUNK_BYTES = 6 * 1024 ** 2;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fail = (status, message) => Object.assign(new Error(message), { status });

/** Public key only. Each operation rechecks the session and current database RLS. */
export function databaseAuthorizer({ supabaseUrl, publicKey }) {
  return async (request, assetId, operation) => {
    const authorization = request.headers.authorization;
    if (!authorization?.startsWith('Bearer ') || authorization.length > 8192) throw fail(401, 'Authentication required');
    const headers = { authorization, apikey: publicKey };
    const call = async (url, options = {}) => {
      const result = await fetch(supabaseUrl + url, { ...options, headers: { ...headers, ...options.headers }, signal: AbortSignal.timeout(15000) });
      if (!result.ok) throw fail(result.status === 401 ? 401 : 403, 'Access denied');
      return result.json();
    };
    const user = await call('/auth/v1/user');
    const assets = await call('/rest/v1/academy_lesson_assets?id=eq.' + assetId + '&select=id,owner_id,lesson_id,file_name,file_size,mime_type,status,storage_backend');
    const asset = assets[0];
    if (!asset || asset.storage_backend !== 'contabo') throw fail(404, 'Asset not available');
    if (operation === 'download' && asset.status === 'ready') return asset; // learner access was checked by RLS
    if (asset.owner_id !== user.id && ['create', 'patch', 'delete', 'head'].includes(operation)) throw fail(403, 'Not upload owner');
    const lessons = await call('/rest/v1/academy_lessons?id=eq.' + asset.lesson_id + '&select=module_id');
    if (!lessons[0]) throw fail(403, 'Lesson unavailable');
    const allowed = await call('/rest/v1/rpc/can_manage_academy_module', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ p_module_id: lessons[0].module_id }),
    });
    if (allowed !== true || !(operation === 'purge' ? asset.status === 'archived' : ['pending', 'uploaded', 'ready'].includes(asset.status))) throw fail(403, 'Upload access revoked');
    if (['create', 'patch', 'delete'].includes(operation) && asset.status !== 'pending') throw fail(409, 'Asset is immutable');
    return asset;
  };
}

/** One process owns this data directory. No public/static filesystem serving. */
export async function createGateway({ directory, authorize, origins = [], signingKey, reserveBytes = 1024 ** 3 }) {
  if (!signingKey || Buffer.byteLength(signingKey) < 32) throw new Error('A signing key of at least 32 bytes is required');
  await mkdir(directory, { recursive: true, mode: 0o700 });
  // Deploy exactly one process per data directory; requests serialize by asset.
  const locked = new Set();
  const base = path.resolve(directory);
  const file = id => path.join(base, id + '.data');
  const receipt = id => path.join(base, id + '.verified.json');
  const sign = payload => createHmac('sha256', signingKey).update(payload).digest('base64url');
  async function atomicJSON(target, value) {
    const temp = target + '.' + randomBytes(8).toString('hex');
    const handle = await open(temp, 'wx', 0o600);
    try { await handle.writeFile(JSON.stringify(value)); await handle.sync(); } finally { await handle.close(); }
    await rename(temp, target);
  }
  // A receipt is only reusable for the exact regular file that was hashed.
  // Size alone cannot detect replacement or same-length tampering.
  async function diskState(id) {
    try {
      const state = await lstat(file(id), { bigint: true });
      if (!state.isFile() || state.nlink !== 1n) throw fail(409, 'Unsafe upload file');
      return state;
    } catch (error) {
      if (error.code === 'ENOENT') throw fail(404, 'Upload not found');
      throw error;
    }
  }
  const fingerprint = state => ({
    dev: String(state.dev), ino: String(state.ino), size: String(state.size),
    mtimeNs: String(state.mtimeNs), ctimeNs: String(state.ctimeNs),
  });
  async function sizeOf(id) { return Number((await diskState(id)).size); }
  async function verify(id, asset) {
    const before = await diskState(id);
    const size = Number(before.size);
    if (size !== Number(asset.file_size)) throw fail(409, 'Upload incomplete');
    const identity = fingerprint(before);
    try {
      const old = JSON.parse(await readFile(receipt(id), 'utf8'));
      if (old.size === size && old.mimeType === asset.mime_type &&
          /^[a-f0-9]{64}$/.test(old.sha256) &&
          JSON.stringify(old.fingerprint) === JSON.stringify(identity)) {
        return { size, mimeType: old.mimeType, sha256: old.sha256 };
      }
    } catch (error) {
      // A truncated/corrupt cached receipt is not evidence about file bytes.
      // Rehash the pinned file instead of permanently blocking verification.
      if (error.code !== 'ENOENT' && !(error instanceof SyntaxError)) throw error;
    }
    // Hash bytes from a pinned, no-follow file descriptor. A path swap between
    // lstat and stream creation must never make us hash a different file.
    const hash = createHash('sha256');
    let handle;
    try {
      try {
        handle = await open(file(id), fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
      } catch (error) {
        if (error.code === 'ELOOP' || error.code === 'ENOENT') throw fail(409, 'Upload file changed');
        throw error;
      }
      const opened = await handle.stat({ bigint: true });
      if (!opened.isFile() || opened.nlink !== 1n ||
          JSON.stringify(fingerprint(opened)) !== JSON.stringify(identity))
        throw fail(409, 'Upload changed before verification');
      const buffer = Buffer.allocUnsafe(1024 * 1024);
      let position = 0;
      while (position < size) {
        const { bytesRead } = await handle.read(buffer, 0, Math.min(buffer.length, size - position), position);
        if (bytesRead === 0) throw fail(409, 'Upload truncated during verification');
        hash.update(buffer.subarray(0, bytesRead));
        position += bytesRead;
      }
      if (JSON.stringify(fingerprint(await handle.stat({ bigint: true }))) !== JSON.stringify(identity) ||
          JSON.stringify(fingerprint(await diskState(id))) !== JSON.stringify(identity))
        throw fail(409, 'Upload changed during verification');
    } finally {
      await handle?.close();
    }
    const result = { size, mimeType: asset.mime_type, sha256: hash.digest('hex') };
    await atomicJSON(receipt(id), { ...result, fingerprint: identity });
    return result;
  }
  const server = http.createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Tus-Resumable', '1.0.0');
    res.setHeader('Tus-Version', '1.0.0');
    res.setHeader('Tus-Extension', 'creation,termination');
    res.setHeader('Tus-Max-Size', String(MAX_BYTES));
    const origin = req.headers.origin;
    let lockId;
    try {
      if (origin) {
        if (!origins.includes(origin)) throw fail(403, 'Origin not allowed');
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
        res.setHeader('Access-Control-Allow-Methods', 'POST,HEAD,PATCH,DELETE,GET,OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Authorization,Content-Type,Tus-Resumable,Upload-Length,Upload-Offset,Upload-Metadata');
        res.setHeader('Access-Control-Expose-Headers', 'Location,Upload-Length,Upload-Offset,Tus-Max-Size');
      }
      const url = new URL(req.url, 'http://gateway.local');
      if (req.method === 'OPTIONS') { res.writeHead(204).end(); return; }
      if (req.method === 'GET' && url.pathname === '/health') {
        const disk = await statfs(base, { bigint: true });
        res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ backend: 'contabo', maxBytes: MAX_BYTES, chunkBytes: CHUNK_BYTES, freeBytes: String(disk.bavail * disk.bsize) })); return;
      }
      const match = url.pathname.match(/^\/(files|assets|download)\/([a-zA-Z0-9-]+)(?:\/(verify|download-token|purge))?$/);
      if (!match || !uuid.test(match[2])) throw fail(404, 'Not found');
      const [, kind, id, action] = match;
      if (kind === 'download') {
        if (req.method !== 'GET' && req.method !== 'HEAD') throw fail(405, 'Method not allowed');
        const token = url.searchParams.get('token') || '';
        if (token.length > 2048) throw fail(403, 'Invalid download token');
        const parts = token.split('.');
        if (parts.length !== 2) throw fail(403, 'Invalid download token');
        const [payload, signature] = parts;
        const expected = Buffer.from(sign(payload || ''));
        const actual = Buffer.from(signature || '');
        if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) throw fail(403, 'Invalid download token');
        let grant;
        try { grant = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')); }
        catch { throw fail(403, 'Invalid download token'); }
        if (!grant || grant.id !== id || !Number.isSafeInteger(grant.expires) || grant.expires < Date.now() ||
            !Number.isSafeInteger(grant.size) || grant.size <= 0 || grant.size > MAX_BYTES ||
            !/^[a-f0-9]{64}$/.test(grant.sha256) || typeof grant.mimeType !== 'string' ||
            typeof grant.name !== 'string') throw fail(403, 'Invalid or expired download token');
        // Pin the verified inode before serving. A path replacement between
        // SHA-256 verification and stream creation must not change the bytes sent.
        const before = await diskState(id);
        const current = await verify(id, { file_size: grant.size, mime_type: grant.mimeType });
        if (current.sha256 !== grant.sha256) throw fail(409, 'Download content changed');
        let handle;
        try {
          handle = await open(file(id), fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
        } catch (error) {
          if (error.code === 'ELOOP' || error.code === 'ENOENT') throw fail(409, 'Download file changed');
          throw error;
        }
        try {
          const opened = await handle.stat({ bigint: true });
          if (!opened.isFile() || opened.nlink !== 1n ||
              JSON.stringify(fingerprint(opened)) !== JSON.stringify(fingerprint(before)))
            throw fail(409, 'Download file changed');
          res.setHeader('Content-Type', 'application/octet-stream');
          res.setHeader('Content-Disposition', "attachment; filename*=UTF-8''" + encodeURIComponent(grant.name));
          res.setHeader('Content-Security-Policy', "sandbox; default-src 'none'");
          res.setHeader('Content-Length', String(current.size));
          res.writeHead(200);
          if (req.method === 'HEAD') res.end();
          else await pipeline(handle.createReadStream({ autoClose: false }), res);
        } finally {
          await handle.close();
        }
        return;
      }
      const operation = action === 'download-token' ? 'download' : action || (req.method === 'POST' && kind === 'files' ? 'create' : req.method.toLowerCase());
      const asset = await authorize(req, id, operation);
      const length = Number(asset.file_size);
      if (!Number.isSafeInteger(length) || length <= 0 || length > MAX_BYTES) throw fail(413, 'File exceeds 8 GiB');
      if (action === 'download-token' && req.method === 'POST') {
        const verified = await verify(id, asset);
        const payload = Buffer.from(JSON.stringify({
          id, name: asset.file_name, expires: Date.now() + 300000,
          size: verified.size, sha256: verified.sha256, mimeType: verified.mimeType,
        })).toString('base64url');
        res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ path: '/download/' + id + '?token=' + payload + '.' + sign(payload) })); return;
      }
      if (kind === 'assets' && action === 'purge' && req.method === 'POST') {
        if (locked.has(id)) throw fail(409, 'Upload busy');
        locked.add(id); lockId = id;
        await rm(file(id), { force: true }); await rm(receipt(id), { force: true });
        res.writeHead(200, { 'Content-Type': 'application/json' }).end('{"deleted":true}'); return;
      }
      if (kind === 'assets' && action === 'verify' && req.method === 'POST') {
        if (locked.has(id)) throw fail(409, 'Upload busy');
        locked.add(id); lockId = id;
        const result = await verify(id, asset);
        res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(result)); return;
      }
      if (kind !== 'files' || action) throw fail(404, 'Not found');
      if (req.headers['tus-resumable'] !== '1.0.0') throw fail(412, 'TUS 1.0.0 required');
      if (locked.has(id)) throw fail(409, 'Upload busy');
      locked.add(id); lockId = id;
      if (req.method === 'POST') {
        if (req.headers['upload-length'] !== String(length)) throw fail(400, 'Declared length does not match asset');
        // Resuming an existing upload must not reserve its full size again.
        // In particular, an almost-complete 8 GiB upload may leave less than
        // 8 GiB free; a duplicate POST is still an idempotent operation.
        let existingSize;
        try { existingSize = await sizeOf(id); }
        catch (error) { if (error.status !== 404) throw error; }
        if (existingSize !== undefined) {
          if (existingSize > length) throw fail(409, 'Stored upload exceeds declared length');
        } else {
          const disk = await statfs(base, { bigint: true });
          if (disk.bavail * disk.bsize < BigInt(length) + BigInt(reserveBytes)) throw fail(507, 'Insufficient disk capacity');
          try { const handle = await open(file(id), 'wx', 0o600); await handle.close(); }
          catch (error) { if (error.code !== 'EEXIST') throw error; }
        }
        res.setHeader('Location', '/files/' + id);
        res.setHeader('Upload-Offset', String(await sizeOf(id)));
        res.writeHead(201).end(); return;
      }
      const offset = await sizeOf(id);
      if (offset > length) throw fail(409, 'Stored upload exceeds declared length');
      res.setHeader('Upload-Length', String(length));
      res.setHeader('Upload-Offset', String(offset));
      if (req.method === 'HEAD') { res.writeHead(200).end(); return; }
      if (req.method === 'DELETE') {
        await rm(file(id)); await rm(receipt(id), { force: true }); res.writeHead(204).end(); return;
      }
      if (req.method !== 'PATCH') throw fail(405, 'Method not allowed');
      if (req.headers['content-type'] !== 'application/offset+octet-stream') throw fail(415, 'Invalid patch content type');
      if (req.headers['upload-offset'] !== String(offset)) throw fail(409, 'Upload offset mismatch');
      const contentLength = Number(req.headers['content-length']);
      if (!Number.isSafeInteger(contentLength) || contentLength <= 0 || contentLength > CHUNK_BYTES || offset + contentLength > length) throw fail(413, 'Invalid chunk size');
      const disk = await statfs(base, { bigint: true });
      if (disk.bavail * disk.bsize < BigInt(contentLength) + BigInt(reserveBytes)) throw fail(507, 'Insufficient disk capacity');
      // Open the exact verified inode, not the path again via createWriteStream.
      // O_NOFOLLOW prevents a symlink swap from redirecting a PATCH to another file.
      const beforePatch = await diskState(id);
      if (Number(beforePatch.size) !== offset) throw fail(409, 'Upload changed before PATCH');
      let received = 0;
      const limiter = new Transform({ transform(chunk, encoding, callback) {
        received += chunk.length;
        callback(received > contentLength ? fail(413, 'Chunk too large') : null, chunk);
      } });
      let handle;
      let writer;
      try {
        try {
          handle = await open(file(id), fsConstants.O_RDWR | fsConstants.O_NOFOLLOW);
        } catch (error) {
          if (error.code === 'ELOOP' || error.code === 'ENOENT') throw fail(409, 'Upload file changed');
          throw error;
        }
        const opened = await handle.stat({ bigint: true });
        if (!opened.isFile() || opened.nlink !== 1n ||
            JSON.stringify(fingerprint(opened)) !== JSON.stringify(fingerprint(beforePatch)))
          throw fail(409, 'Upload file changed before PATCH');
        writer = handle.createWriteStream({ start: offset, autoClose: false });
        await pipeline(req, limiter, writer);
        if (received !== contentLength) throw fail(400, 'Truncated chunk');
        await handle.sync();
        const onDisk = await diskState(id);
        const written = await handle.stat({ bigint: true });
        if (Number(written.size) !== offset + contentLength ||
            JSON.stringify(fingerprint(onDisk)) !== JSON.stringify(fingerprint(written)))
          throw fail(409, 'Upload file changed during PATCH');
      } finally {
        // FileHandle.close waits for active streams. Explicitly release the writer
        // after pipeline before closing the descriptor (including aborted PATCHes).
        writer?.destroy();
        await handle?.close();
        // Interrupted PATCH bytes remain resumable; HEAD reports the real offset.
        res.setHeader('Upload-Offset', String(await sizeOf(id)));
      }
      res.writeHead(204).end();
    } catch (error) {
      if (!res.headersSent && !res.destroyed) res.writeHead(error.status || 500, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: error.status ? error.message : 'Storage operation failed' }));
      else if (!res.destroyed) res.destroy();
    } finally { if (lockId) locked.delete(lockId); }
  });
  server.requestTimeout = 300000;
  server.headersTimeout = 30000;
  return server;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const directory = process.env.ASLAN_UPLOAD_DIRECTORY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!directory || !supabaseUrl?.startsWith('https://') || !publicKey) throw new Error('Storage and identity settings are required');
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const secretPath = path.join(directory, '.download-key');
  try { const handle = await open(secretPath, 'wx', 0o600); await handle.writeFile(randomBytes(48).toString('hex')); await handle.close(); }
  catch (error) { if (error.code !== 'EEXIST') throw error; }
  const server = await createGateway({ directory, signingKey: (await readFile(secretPath, 'utf8')).trim(), authorize: databaseAuthorizer({ supabaseUrl, publicKey }), origins: (process.env.ASLAN_UPLOAD_ORIGINS || '').split(',').filter(Boolean) });
  server.listen(Number(process.env.PORT || 9191), process.env.HOST || '127.0.0.1', () => console.log('ASLAN_CONTABO_UPLOAD_LISTENING'));
}
