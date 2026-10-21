# ASLAN unified 8 GiB transfer rollout (staging only)

## Current state
This branch introduces a shared authorization boundary and an isolated TUS server manifest.
It does **not** enable production uploads, open a public upload endpoint, or change existing Supabase Storage paths.

## Required before rollout
1. Review/pin the tusd container image digest and confirm CLI options against the selected version.
2. Build a dedicated authenticated gateway that validates short-lived, one-use upload grants on every create/resume operation, enforces user/service/resource/size, and prevents cross-user access to upload IDs.
3. Implement and verify the tusd hook receiver (pre-create and post-finish) and durable database state; never trust metadata alone.
4. Protect gateway with HTTPS, origin policy, rate limits, file-type checks, antivirus/quarantine and storage quotas. Keep tusd on loopback.
5. Create per-service authorization adapters (academy, market, community, messages, services, admin, partners). Unsupported services remain disabled.
6. Implement browser client with persistent upload fingerprints, retry/backoff, pause/resume, abort, and clear completion confirmation.
7. Test 50 MiB, 2 GiB, 8 GiB, disconnect/resume, incorrect offset, expired grant, cross-user access, disk full and interrupted finalize.
8. Only after green tests, gradually route traffic using a feature flag. Keep the existing Supabase upload path active until the new path passes acceptance.

The 8 GiB limit is per file; disk capacity is a separate operational concern.
