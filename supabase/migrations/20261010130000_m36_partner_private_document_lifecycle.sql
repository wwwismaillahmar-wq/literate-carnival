-- M36: make partner KYC document storage private and complete its upload/review lifecycle.
-- The browser receives only a short-lived signed upload token; public object URLs are never used.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'aslan-private-documents',
  'aslan-private-documents',
  false,
  10485760,
  array['application/pdf','image/jpeg','image/png','image/webp']::text[]
)
on conflict (id) do update
set name = excluded.name,
    public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists partner_private_documents_owner_insert on storage.objects;
create policy partner_private_documents_owner_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'aslan-private-documents'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists partner_private_documents_owner_select on storage.objects;
create policy partner_private_documents_owner_select
on storage.objects for select to authenticated
using (
  bucket_id = 'aslan-private-documents'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or (select private.is_super_admin())
  )
);

drop policy if exists partner_private_documents_owner_delete on storage.objects;
create policy partner_private_documents_owner_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'aslan-private-documents'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or (select private.is_super_admin())
  )
);

alter table public.partner_identity_documents
  add column if not exists upload_status text not null default 'pending'
    check (upload_status in ('pending','uploaded','failed'));
alter table public.partner_identity_documents
  add column if not exists uploaded_at timestamptz;

create index if not exists partner_identity_documents_upload_status_idx
  on public.partner_identity_documents(owner_id, upload_status, created_at desc);

-- Only these definer functions can advance upload completion or review state.
revoke update on public.partner_identity_documents from authenticated;

create or replace function public.complete_partner_identity_document(p_document_id uuid)
returns table(document_id uuid, upload_status text, uploaded_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_doc public.partner_identity_documents%rowtype;
  v_now timestamptz := now();
begin
  if auth.uid() is null then raise exception 'UNAUTHENTICATED'; end if;

  select * into v_doc
  from public.partner_identity_documents
  where id = p_document_id and owner_id = auth.uid()
  for update;

  if not found then raise exception 'DOCUMENT_NOT_FOUND'; end if;

  if v_doc.upload_status = 'uploaded' then
    return query select v_doc.id, v_doc.upload_status, v_doc.uploaded_at;
    return;
  end if;

  if not exists (
    select 1 from storage.objects o
    where o.bucket_id = v_doc.storage_bucket and o.name = v_doc.object_path
  ) then
    raise exception 'DOCUMENT_OBJECT_MISSING';
  end if;

  update public.partner_identity_documents
  set upload_status = 'uploaded', uploaded_at = coalesce(uploaded_at, v_now)
  where id = v_doc.id
  returning * into v_doc;

  return query select v_doc.id, v_doc.upload_status, v_doc.uploaded_at;
end;
$function$;

revoke all on function public.complete_partner_identity_document(uuid) from public, anon;
grant execute on function public.complete_partner_identity_document(uuid) to authenticated;

create or replace function public.admin_review_partner_identity_document(
  p_document_id uuid,
  p_status text,
  p_review_note text default ''
)
returns table(document_id uuid, review_status text, reviewer_id uuid, reviewed_at timestamptz, review_note text)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_doc public.partner_identity_documents%rowtype;
  v_now timestamptz := now();
begin
  if auth.uid() is null or not private.is_super_admin(auth.uid()) then
    raise exception 'FORBIDDEN';
  end if;
  if p_status not in ('verified','rejected','needs_information','expired')
     or length(coalesce(p_review_note,'')) > 2000 then
    raise exception 'INVALID_REVIEW';
  end if;

  select * into v_doc
  from public.partner_identity_documents
  where id = p_document_id
  for update;
  if not found then raise exception 'DOCUMENT_NOT_FOUND'; end if;
  if v_doc.upload_status <> 'uploaded' then raise exception 'DOCUMENT_NOT_UPLOADED'; end if;

  update public.partner_identity_documents
  set review_status = p_status,
      reviewer_id = auth.uid(),
      reviewed_at = v_now,
      review_note = coalesce(p_review_note,'')
  where id = v_doc.id
  returning * into v_doc;

  return query select v_doc.id, v_doc.review_status, v_doc.reviewer_id, v_doc.reviewed_at, v_doc.review_note;
end;
$function$;

revoke all on function public.admin_review_partner_identity_document(uuid,text,text) from public, anon;
grant execute on function public.admin_review_partner_identity_document(uuid,text,text) to authenticated;
