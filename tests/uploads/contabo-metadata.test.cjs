const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');

test('real Postgres metadata constraints admit Contabo 8 GiB and preserve legacy storage limits', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create schema private; create table public.academy_lesson_assets (
      id int primary key, file_size bigint not null constraint academy_lesson_assets_file_size_check check(file_size between 1 and 52428800),
      mime_type text not null constraint academy_lesson_assets_mime_type_check check(mime_type in ('video/mp4','text/plain')),
      status text not null default 'pending' constraint academy_lesson_assets_status_check check(status in ('pending','ready','archived'))
    ); insert into public.academy_lesson_assets(id,file_size,mime_type) values(1,10,'text/plain');`);
    const migration = fs.readFileSync(path.join(__dirname,'../../supabase/migrations/20261024114252_academy_contabo_8gib_assets.sql'),'utf8');
    await db.exec(migration);
    const old = await db.query('select storage_backend from public.academy_lesson_assets where id=1');
    assert.equal(old.rows[0].storage_backend, 'supabase');
    await db.exec("insert into public.academy_lesson_assets(id,file_size,mime_type,storage_backend) values(2,8589934592,'video/mp4','contabo')");
    await assert.rejects(db.exec("insert into public.academy_lesson_assets(id,file_size,mime_type,storage_backend) values(3,8589934593,'video/mp4','contabo')"), /file_size_check/);
    await assert.rejects(db.exec("insert into public.academy_lesson_assets(id,file_size,mime_type) values(3,52428801,'video/mp4')"), /file_size_check/);
    await assert.rejects(db.exec("update public.academy_lesson_assets set storage_backend='contabo' where id=1"), /BACKEND_IMMUTABLE/);
    const manifest = require('../../src/lib/academy/mime-types.json');
    for (const [index,mime] of [...new Set(Object.values(manifest))].entries()) {
      await db.query("insert into public.academy_lesson_assets(id,file_size,mime_type,storage_backend,status) values($1,1,$2,'contabo','uploaded')", [index+10,mime]);
    }
    await assert.rejects(db.exec("insert into public.academy_lesson_assets(id,file_size,mime_type,storage_backend) values(100,1,'application/x-executable','contabo')"), /mime_type_check/);
    await db.exec("update public.academy_lesson_assets set content_sha256=repeat('a',64),status='uploaded' where id=2");
    await assert.rejects(db.exec("update public.academy_lesson_assets set content_sha256='invalid' where id=2"), /content_sha256_check/);
  } finally { await db.close(); }
});
