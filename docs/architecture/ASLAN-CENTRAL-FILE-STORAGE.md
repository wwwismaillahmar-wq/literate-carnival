# ASLAN Central File Storage — implementation contract v1.0

Status: **architecture specification only**. This document does not provision or migrate any live storage.

## Scope
One logical media/document storage service for **all** website spaces: brand, public pages, market, academy, community, services, talent, partners, company, administration, archives and temporary uploads. Support images, videos, audio, PDFs, office documents, compressed files and future formats through explicit validation rules.

## Separation of responsibilities
- **GitHub**: application source, migrations, deployment configuration, small versioned static assets. Never user uploads or credentials.
- **Contabo object storage / SeaweedFS**: primary object bytes, preferably S3-compatible API. Object keys are opaque and stable, not user-supplied filenames.
- **Supabase**: authoritative file metadata, ownership, references, access policies, upload states, audit events; do not assume Supabase Storage policies govern Contabo objects.
- **TUSD**: resumable large uploads (2–8 GiB and configurable higher limits); authentication and upload ownership required.
- **CDN / media gateway**: controlled delivery of public assets and short-lived authorized access for private files.
- **Notion**: approved technical instructions and reports; never a source of truth for binary files or access permissions.

## Logical prefixes
```text
aslan/
  brand/
  website/
  market/
  academy/
  community/
  services/
  talent/
  partners/
  company/
  admin/
  archives/
  temporary/
```
These prefixes are *logical namespaces*, not permission boundaries. Storage permissions must be enforced server-side by verified metadata and object gateway credentials. Backup copies must be physically/logically isolated from the writable primary store, not merely another prefix.

## Metadata and file lifecycle
Each object needs an immutable file ID, owner/tenant ID, module, original filename (display only), sanitized MIME/extension, declared and verified size, checksum, storage key, visibility (public/private/restricted), processing state, created/updated timestamps and retention policy. Track states initiated → uploading → quarantined → scanning/processing → ready or rejected → deleted. Clean orphaned temporary uploads by policy.

## Security and reliability
- Never expose Contabo S3 master credentials, service-role keys, or long-lived signed links in browsers, repository, logs or Notion.
- Verify authorization on each upload/download request; use scoped short-lived tokens; no path traversal or user-controlled storage keys.
- Validate MIME by content where feasible; enforce module-specific allowlists and quotas; malware scanning/quarantine for untrusted files; avoid executing uploaded content.
- Implement multipart/TUS resumability and checksums, retry/backoff, expiry and idempotent finalize. Use asynchronous video transcoding and previews.
- Public images can use CDN caching; private academy and community files require protected delivery and revocation strategy.
- Backups require independent access controls, retention, restore drills and monitoring. Never modify historical closed backups during rollout.
- Preserve existing media URLs through compatibility mapping and staged migration; never bulk move/delete live objects without inventory, dry run, verified backup and approval.

## Execution phases and acceptance
1. Inventory existing Contabo/SeaweedFS and Supabase media paths, credentials **presence** (not values), bucket policies and URL usage.
2. Implement metadata schema, gateway authorization and object namespace in an isolated environment.
3. Integrate resumable TUS uploads and secure downloads, then adapt each module incrementally.
4. Test upload/resume/checksum for representative formats and 2 GiB / 8 GiB files, public/private access, signed-link expiry, CDN behavior, restore and migration rollback.
5. Provide evidence, obtain approval, and only then migrate or deploy production changes.

**ASLAN Automation Orchestrator** executes approved technical commands and reports results; it does not decide business policy or independently authorize production release.
