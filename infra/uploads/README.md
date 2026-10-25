# ASLAN TUS gateway — stage 2

The Docker Compose service is deliberately bound to localhost. Do not publish port 1080.
A signed intent is **not** sufficient authorization for tusd: every create, resume,
HEAD, PATCH, DELETE and download path must be mediated by a gateway that verifies
authorization, upload ownership and current revocation state.

## Staging requirements

- Create ASLAN_UPLOAD_GRANT_SECRET (random >=32 bytes) on the application and gateway hosts.
  Never expose it via NEXT_PUBLIC_ variables or commit its value.
- Implement durable one-time grant redemption and per-upload ownership binding.
- Validate grant expiry, declared size, target service/resource, and rate limits.
- Verify tusd pre-create and post-finish hooks with authenticated requests.
- Verify actual byte count, file signature, quarantine/scan before publication.
- Configure TLS reverse proxy and authenticated browser TUS endpoint.
- Preserve existing Supabase Storage upload implementation as fallback.

## Acceptance tests (not yet executed)

1. 50 MiB end-to-end upload with checksum validation.
2. 2 GiB upload with checksum validation and connection loss/resume.
3. 8 GiB upload with checksum validation and connection loss/resume.
4. Expired, replayed, tampered and cross-user tokens denied.
5. Offset mismatch, disk full, duplicate completion, malicious MIME and upload cancellation.
6. No production cutover until the complete acceptance matrix passes.

Note: staging manifest and signed grant primitives alone do not constitute an operational gateway.
