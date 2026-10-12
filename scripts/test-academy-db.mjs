// Isolated PostgreSQL behavior gate; no credentials or production writes.
import {PGlite} from '@electric-sql/pglite';
import {pgtap} from '@electric-sql/pglite-pgtap';
import {pgcrypto} from '@electric-sql/pglite/contrib/pgcrypto';
import {readFile,readdir} from 'node:fs/promises';
import path from 'node:path';
const db=await PGlite.create({extensions:{pgtap,pgcrypto}});
const bootstrap="create schema auth;create schema storage;create schema extensions;\ncreate extension pgcrypto with schema extensions;\ncreate role anon nologin;create role authenticated nologin;create role service_role nologin bypassrls;create role authenticator nologin;\ngrant usage on schema public,auth,storage,extensions to anon,authenticated,service_role;\ncreate table auth.users(id uuid primary key,aud text,role text,email text unique,encrypted_password text,email_confirmed_at timestamptz,raw_app_meta_data jsonb default '{}',raw_user_meta_data jsonb default '{}',created_at timestamptz,updated_at timestamptz);\ncreate function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;\ngrant execute on function auth.uid() to anon,authenticated,service_role;\ncreate table storage.buckets(id text primary key,name text not null,public boolean not null default false,file_size_limit bigint,allowed_mime_types text[]);\ncreate table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text not null,owner uuid,owner_id text,metadata jsonb default '{}',created_at timestamptz default now(),updated_at timestamptz default now(),unique(bucket_id,name));\nalter table storage.objects enable row level security;alter table storage.buckets enable row level security;\ngrant select,insert,update,delete on storage.objects to anon,authenticated;grant select on storage.buckets to anon,authenticated;\ncreate function storage.foldername(text) returns text[] language sql immutable as $$ select (string_to_array($1,'/'))[1:cardinality(string_to_array($1,'/'))-1] $$;\nalter default privileges in schema public grant all on tables to anon,authenticated,service_role;\nalter default privileges in schema public grant all on sequences to anon,authenticated,service_role;\ncreate function storage.protect_delete() returns trigger language plpgsql as $$ begin\n if coalesce(current_setting('storage.allow_delete_query',true),'false') <> 'true' then\n raise exception 'Direct deletion from storage tables is not allowed. Use the Storage API instead.' using errcode='42501';\n end if; return null;end; $$;\ncreate trigger protect_objects_delete before delete on storage.objects for each statement execute function storage.protect_delete();\ncreate publication supabase_realtime;\ncreate extension pgtap with schema extensions;set search_path=public,extensions;";
let stage='bootstrap';
try{
 await db.exec(bootstrap);console.log((await db.query('select version()')).rows[0].version);
 const migrations=(await readdir('supabase/migrations')).filter(x=>x.endsWith('.sql')).sort(),seen=new Set();
 for(const name of migrations){
 if(!/^\d{14}_/.test(name)||seen.has(name.slice(0,14)))throw new Error('Invalid/duplicate migration timestamp: '+name);
 seen.add(name.slice(0,14));stage=name;await db.exec(await readFile(path.join('supabase/migrations',name),'utf8'));
 }
 console.log('Application migrations replayed:',migrations.length);
 const requested=process.argv.slice(2);
 const tests=requested.length&&!requested.includes('--all')?requested:(await readdir('supabase/tests',{recursive:true})).filter(x=>x.endsWith('.sql')).sort();
 let assertions=0;
 for(const name of tests){
 stage=name;
 const source=await readFile(path.join('supabase/tests',name),'utf8');
 const results=[];
 for(const checkpoint of source.split('-- verification checkpoint\n')){
 const chunk=await db.exec(checkpoint);results.push(...chunk);
 for(const result of chunk)for(const row of result.rows)for(const value of Object.values(row))if(typeof value==='string'&&/^(not ok |#)/.test(value))console.log(name+': '+value);
 }
 const lines=results.flatMap(r=>r.rows.flatMap(row=>Object.values(row))).filter(v=>typeof v==='string'&&/^(ok |not ok |#|\d+\.\.)/.test(v));
 for(const line of lines)console.log(name+': '+line);
 if(lines.some(line=>/^(not ok |# Looks like)/.test(line)))throw new Error('Failed pgTAP assertions: '+name);
 if(!lines.some(line=>/^\d+\.\./.test(line)))throw new Error('No TAP plan: '+name);
 assertions+=lines.filter(line=>/^ok /.test(line)).length;
 }
 console.log('PASS:',tests.length,'files /',assertions,'assertions. Auth/Storage HTTP and simultaneous connections are separate checks.');
}catch(error){console.error('FAIL at',stage+':',error.message);process.exitCode=1;}
finally{await db.close();}
