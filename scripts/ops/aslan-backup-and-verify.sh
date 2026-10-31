#!/usr/bin/env bash
set -euo pipefail
umask 077
export LC_ALL=C
SOURCE_CONTAINER=aslan-postgres
BACKUP_DIR="${ASLAN_BACKUP_DIR:-$HOME/aslan-postgres-backups}"
TEST_CONTAINER='' TEST_VOLUME='' TMP_FILE='' LOCK_DIR=''
log(){ printf '%s\n' "$*"; }
fail(){ log "RESULT: FAIL ($1)" >&2; exit 1; }
cleanup(){
  rc=$?
  trap - EXIT INT TERM
  [[ -z "$TEST_CONTAINER" ]] || docker rm -f "$TEST_CONTAINER" >/dev/null 2>&1 || true
  [[ -z "$TEST_VOLUME" ]] || docker volume rm "$TEST_VOLUME" >/dev/null 2>&1 || true
  [[ -z "$TMP_FILE" ]] || rm -f -- "$TMP_FILE"
  [[ -z "$LOCK_DIR" ]] || rmdir -- "$LOCK_DIR" >/dev/null 2>&1 || true
  (( rc == 0 )) || log 'RESULT: FAIL; no intentional changes to source database' >&2
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
for bin in docker gzip sha256sum stat base64; do command -v "$bin" >/dev/null || fail "Missing dependency: $bin"; done
[[ "$(docker inspect -f '{{.State.Running}}' "$SOURCE_CONTAINER" 2>/dev/null)" == true ]] || fail 'Source PostgreSQL container not running'
IMAGE="$(docker inspect -f '{{.Config.Image}}' "$SOURCE_CONTAINER")"
[[ -n "$IMAGE" ]] || fail 'Cannot determine PostgreSQL image'
mkdir -p -- "$BACKUP_DIR"
chmod 700 -- "$BACKUP_DIR"
BACKUP_DIR="$(cd -- "$BACKUP_DIR" && pwd -P)"
LOCK_DIR="$BACKUP_DIR/.backup-lock"
mkdir -- "$LOCK_DIR" 2>/dev/null || fail 'Another backup may be running'
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
RUN_ID="$(date +%s)-$$"
BACKUP_FILE="$BACKUP_DIR/aslan-postgres-$STAMP-$RUN_ID.sql.gz"
TMP_FILE="$BACKUP_FILE.partial"
CHECKSUM_FILE="$BACKUP_FILE.sha256"
log 'STAGE: discover configured PostgreSQL role (name not logged)'
# Read role from the container environment without exposing credentials or names.
# The OS user postgres is not necessarily the PostgreSQL database role.
DB_ROLE="$(docker exec -u postgres "$SOURCE_CONTAINER" sh -c 'printf "%s" "${POSTGRES_USER:-${PGUSER:-}}"')" || fail 'Cannot read configured database role'
[[ -n "$DB_ROLE" ]] || fail 'No POSTGRES_USER or PGUSER configured; explicit role verification required'
[[ "$DB_ROLE" =~ ^[a-zA-Z_][a-zA-Z0-9_]*$ ]] || fail 'Invalid configured database role' 
# Verify actual database authentication before opening the backup output.
docker exec -u postgres "$SOURCE_CONTAINER" pg_isready -U "$DB_ROLE" -d postgres >/dev/null 2>&1 || fail 'Configured role cannot reach postgres database'
log 'STAGE: pg_dumpall'
# No SQL output or database role is written to public logs.
docker exec -u postgres "$SOURCE_CONTAINER" pg_dumpall -U "$DB_ROLE" --no-role-passwords | gzip -c > "$TMP_FILE" || fail 'pg_dumpall failed'
[[ -s "$TMP_FILE" ]] || fail 'Empty dump'
gzip -t -- "$TMP_FILE" || fail 'Gzip integrity failed'
mv -- "$TMP_FILE" "$BACKUP_FILE"
TMP_FILE=''
chmod 600 -- "$BACKUP_FILE"
(cd -- "$BACKUP_DIR" && sha256sum -- "$(basename "$BACKUP_FILE")" > "$(basename "$CHECKSUM_FILE")")
chmod 600 -- "$CHECKSUM_FILE"
(cd -- "$BACKUP_DIR" && sha256sum -c --status -- "$(basename "$CHECKSUM_FILE")") || fail 'Checksum mismatch'
log 'STAGE: compressed backup and checksum verified'
TEST_CONTAINER="aslan-restore-check-$RUN_ID"
TEST_VOLUME="aslan-restore-check-$RUN_ID"
docker volume create "$TEST_VOLUME" >/dev/null || fail 'Cannot create test volume'
TEST_PASSWORD="$(head -c 48 /dev/urandom | base64 | tr -d '\n')"
export POSTGRES_PASSWORD="$TEST_PASSWORD"
unset TEST_PASSWORD
log 'STAGE: isolated PostgreSQL restore test'
docker run -d --name "$TEST_CONTAINER" --network none --mount "type=volume,source=$TEST_VOLUME,target=/var/lib/postgresql/data" -e POSTGRES_PASSWORD -e POSTGRES_USER=postgres -e POSTGRES_DB=postgres --entrypoint docker-entrypoint.sh "$IMAGE" postgres >/dev/null || fail 'Cannot start isolated test'
unset POSTGRES_PASSWORD
READY=0
for _ in $(seq 1 90); do
  if docker exec -u postgres "$TEST_CONTAINER" pg_isready -U postgres -d postgres >/dev/null 2>&1; then READY=1; break; fi
  sleep 2
done
(( READY == 1 )) || fail 'Test database not ready'
# Strict restore, output suppressed. pg_dumpall may contain cluster roles;
# any incompatibility is a failure requiring investigation, not a pass.
if ! (gzip -cd -- "$BACKUP_FILE" | docker exec -i -u postgres "$TEST_CONTAINER" psql -X -q -v ON_ERROR_STOP=1 -U postgres -d postgres >/dev/null 2>&1); then
  fail 'Restore failed; SQL details suppressed'
fi
docker exec -u postgres "$TEST_CONTAINER" psql -X -qAt -v ON_ERROR_STOP=1 -U postgres -d postgres -c 'SELECT 1' 2>/dev/null | grep -qx 1 || fail 'Restored PostgreSQL health check failed'
log 'RESTORE_TEST: PASS'
log "BACKUP_FILE: $BACKUP_FILE"
log "BACKUP_BYTES: $(stat -c %s -- "$BACKUP_FILE")"
log "SHA256: $(cut -d ' ' -f1 "$CHECKSUM_FILE")"
log 'RESULT: PASS'
