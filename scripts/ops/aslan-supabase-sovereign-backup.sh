#!/usr/bin/env bash
set -euo pipefail
umask 077
: "${SUPABASE_DB_URL:?Missing SUPABASE_DB_URL secret}"
: "${OPS_HOST:?Missing ASLAN_OPS_HOST secret}"
: "${OPS_USER:?Missing ASLAN_OPS_USER secret}"
: "${OPS_HOST_KEY:?Missing ASLAN_OPS_HOST_KEY secret}"
: "${OPS_KEY:?Missing ASLAN_OPS_SSH_KEY secret}"
export PGCONNECT_TIMEOUT=15 PGSSLMODE=verify-full
# URL must explicitly configure sslmode=verify-full (or equivalent trusted TLS).
# Avoid printing connection strings or dump contents.
[[ "$SUPABASE_DB_URL" == *zyenfobyorjfwkdgeube* ]] || { echo 'FAIL: Supabase project identity mismatch'; exit 1; }
[[ "$SUPABASE_DB_URL" == *sslmode=verify-full* ]] || { echo 'FAIL: require sslmode=verify-full in connection URL'; exit 1; }
tmp="$(mktemp -d)"
trap 'rm -rf -- "$tmp"' EXIT
mkdir -p "$HOME/.ssh"
printf '%s\n' "$OPS_HOST_KEY" > "$HOME/.ssh/known_hosts"
printf '%s\n' "$OPS_KEY" > "$HOME/.ssh/id_ed25519"
chmod 600 "$HOME/.ssh/id_ed25519"
ssh_args=(-o BatchMode=yes -o StrictHostKeyChecking=yes -o ConnectTimeout=15 -i "$HOME/.ssh/id_ed25519")
echo 'STAGE: validate live database identity'
db="$(psql "$SUPABASE_DB_URL" -X -qAt -v ON_ERROR_STOP=1 -c 'select current_database()')"
[[ "$db" == postgres ]] || { echo 'FAIL: unexpected database'; exit 1; }
tables="$(psql "$SUPABASE_DB_URL" -X -qAt -v ON_ERROR_STOP=1 -c "select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind in ('r','p') and not c.relispartition and n.nspname not in ('pg_catalog','information_schema') and n.nspname not like 'pg_toast%'")"
echo "SOURCE_TABLES: $tables"
(( tables >= 117 )) || { echo 'FAIL: expected at least 117 source tables'; exit 1; }
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
name="aslan-supabase-$stamp.sql.gz"
echo 'STAGE: streaming pg_dump from live Supabase'
pg_dump --dbname="$SUPABASE_DB_URL" --format=plain --no-owner --no-acl --schema=public --schema=auth --schema=storage --schema=realtime --schema=cron --schema=net --schema=vault --schema=supabase_migrations | gzip -c > "$tmp/$name"
gzip -t "$tmp/$name"
test -s "$tmp/$name"
(cd "$tmp" && sha256sum "$name" > "$name.sha256")
echo 'STAGE: transfer encrypted over SSH to Contabo'
ssh "${ssh_args[@]}" "$OPS_USER@$OPS_HOST" 'umask 077; mkdir -p "$HOME/aslan-postgres-backups"; chmod 700 "$HOME/aslan-postgres-backups"'
scp "${ssh_args[@]}" "$tmp/$name" "$tmp/$name.sha256" "$OPS_USER@$OPS_HOST:aslan-postgres-backups/"
ssh "${ssh_args[@]}" "$OPS_USER@$OPS_HOST" "cd \"\$HOME/aslan-postgres-backups\" && sha256sum -c -- '$name.sha256' && gzip -t -- '$name' && stat -c 'BACKUP_BYTES: %s' -- '$name' && sha256sum -- '$name'"
echo "SOURCE_DATABASE: $db"
echo "BACKUP_NAME: $name"
echo 'RESULT: FILE_TRANSFER_AND_HASH_PASS; RESTORE_NOT_YET_VERIFIED'
