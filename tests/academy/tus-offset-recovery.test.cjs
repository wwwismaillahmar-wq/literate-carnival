const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// Execute the exact TypeScript module consumed by the browser, not a duplicate algorithm.
const source = fs.readFileSync(path.join(__dirname, '../../src/lib/uploads/tus-response.ts'), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const moduleRef = { exports: {} };
vm.runInNewContext(js, { module: moduleRef, exports: moduleRef.exports });
const { parseTusOffset, assertTusLength, recoverTusOffset } = moduleRef.exports;
const headers = values => ({ get: name => Object.prototype.hasOwnProperty.call(values, name) ? values[name] : null });

test('TUS offset rejects missing, malformed, noncanonical and out-of-bounds values', () => {
  assert.equal(parseTusOffset(headers({ 'Upload-Offset': '0' }), 10), 0);
  assert.equal(parseTusOffset(headers({ 'Upload-Offset': '10' }), 10), 10);
  for (const value of [null, '', '-1', '01', '1.5', 'NaN', '11', '9007199254740992']) {
    assert.throws(() => parseTusOffset(headers(value === null ? {} : { 'Upload-Offset': value }), 10), /TUS/);
  }
});

test('TUS HEAD rejects mismatched or missing upload length', () => {
  assert.doesNotThrow(() => assertTusLength(headers({ 'Upload-Length': '10' }), 10));
  for (const value of [null, '0', '9', '11', '010', 'ten']) {
    assert.throws(() => assertTusLength(headers(value === null ? {} : { 'Upload-Length': value }), 10), /TUS/);
  }
});

test('lost final PATCH acknowledgement recovers completed upload without sending another chunk', async () => {
  const size = 13 * 1024 * 1024;
  let headCalls = 0;
  const offset = await recoverTusOffset('/files/upload-id', size, 12 * 1024 * 1024, async url => {
    assert.equal(url, '/files/upload-id');
    headCalls++;
    return { status: 200, headers: headers({ 'Upload-Length': String(size), 'Upload-Offset': String(size) }) };
  });
  assert.equal(headCalls, 1);
  assert.equal(offset, size);
  assert.equal(offset < size, false, 'client must not send a zero-length final PATCH');
});

test('recovery rejects server regression and inconsistent upload identity', async () => {
  const recover = (offset, length) => recoverTusOffset('/files/id', 100, 50, async () => ({
    status: 200, headers: headers({ 'Upload-Length': length, 'Upload-Offset': offset }),
  }));
  await assert.rejects(recover('49', '100'), /regressed/);
  await assert.rejects(recover('100', '99'), /length/);
  await assert.rejects(recover('missing', '100'), /offset/i);
});

test('recovery rejects forged offset headers on failed or unauthorized HEAD responses', async () => {
  for (const status of [301, 401, 403, 404, 409, 500]) {
    await assert.rejects(
      recoverTusOffset('/files/id', 100, 50, async () => ({
        status, headers: headers({ 'Upload-Length': '100', 'Upload-Offset': '100' }),
      })),
      /TUS HEAD failed/,
      'HEAD status ' + status + ' must not be trusted',
    );
  }
  assert.equal(await recoverTusOffset('/files/id', 100, 50, async () => ({
    status: 204, headers: headers({ 'Upload-Length': '100', 'Upload-Offset': '100' }),
  })), 100);
});

test('TUS protocol offset parser handles 8 GiB boundaries without truncation', () => {
  const size = 8 * 1024 ** 3;
  assert.equal(parseTusOffset(headers({ 'Upload-Offset': String(size) }), size), size);
  assert.doesNotThrow(() => assertTusLength(headers({ 'Upload-Length': String(size) }), size));
  assert.throws(() => parseTusOffset(headers({ 'Upload-Offset': String(size + 1) }), size), /TUS/);
});


test('TUS retry refuses forged HEAD offset that skips beyond the last transmitted chunk', async () => {
  const size = 8 * 1024 ** 3;
  const before = 1024 * 1024 * 1024;
  const chunk = 6 * 1024 * 1024;
  const fakeHead = async () => ({
    status: 200,
    headers: headers({ 'Upload-Length': String(size), 'Upload-Offset': String(before + chunk + 1) }),
  });
  await assert.rejects(
    recoverTusOffset('/files/id', size, before, fakeHead, before + chunk),
    /advanced beyond the expected PATCH/,
  );
  assert.equal(await recoverTusOffset('/files/id', size, before, async () => ({
    status: 200,
    headers: headers({ 'Upload-Length': String(size), 'Upload-Offset': String(before + chunk) }),
  }), before + chunk), before + chunk);
  await assert.rejects(
    recoverTusOffset('/files/id', size, before, fakeHead, size + 1),
    /advanced beyond the expected PATCH/,
  );
});
