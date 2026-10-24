# Academy file storage on the funded Contabo server

The academy transport writes file bytes to Contabo, not Supabase Storage. Supabase
continues to store identities, lesson permissions and asset metadata. No storage
subscription upgrade is required for this transport.

## Deployment

`aslan-academy-contabo-upload.yml` uses the existing operations SSH identity,
tests real 2/8 GiB files on the server, and installs a separate gateway on
127.0.0.1:9191. It preserves the previous staging tusd, website and databases.
The gateway data and download signing key persist outside source releases.

The deploy script uses the server's existing DNS hostname for TLS only when it
resolves to an address owned by that server and ports 80/443 are unused. It never
replaces an existing TLS proxy. If either prerequisite is missing, the job
reports the specific blocker and retains the working loopback gateway.

After public TLS passes, set server-side `ACADEMY_UPLOAD_BASE_URL` to the emitted
HTTPS origin and deploy the application change. The gateway's
`ASLAN_UPLOAD_ORIGINS` must include the exact website origin. File transfers go
directly from the browser to Contabo; Vercel only handles small intent/finalize
requests. Database migration adds backend metadata and an 8 GiB constraint for
Contabo assets while preserving legacy storage metadata limits.

## Acceptance and boundaries

- `node --test tests/uploads/contabo-gateway.test.mjs`: authorization, offsets,
  partial PATCH, durable resume, process restart and SHA-256.
- `ASLAN_LARGE_TRANSFER=1 node --test tests/uploads/contabo-gateway.test.mjs`:
  additionally transports and hashes real 2 and 8 GiB files; temporary data is
  removed. This tests the gateway with an injected test identity on loopback.
- `node --test tests/uploads/contabo-metadata.test.cjs`: real Postgres-compatible
  size, MIME and backend constraints.
- `npm run test:academy` and `npm run typecheck`: application contracts.

Loopback tests do not prove public browser connectivity or authenticated lesson
creation. Record those separately before calling the entire academy journey
complete. New files remain `uploaded` pending the existing content review gate;
this change does not silently approve or execute uploaded content. Downloads
use short-lived signed URLs and force attachment delivery with nosniff/CSP.
One gateway process owns each data directory. Keep persistent data backed up.
