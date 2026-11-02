#!/usr/bin/env bash
set -euo pipefail
umask 077
: "${SUPABASE_DB_URL:?Missing SUPABASE_DB_URL secret}"
: "${OPS_HOST:?Missing ASLAN_OPS_HOST secret}"
: "${OPS_USER:?Missing ASLAN_OPS_USER secret}"
: "${OPS_HOST_KEY:?Missing ASLAN_OPS_HOST_KEY secret}"
: "${OPS_KEY:?Missing ASLAN_OPS_SSH_KEY secret}"
export PGCONNECT_TIMEOUT=15 PGOPTIONS='-c default_transaction_read_only=on'
# Diagnostic gates never print URLs, credentials, or certificates.
# The expected project reference may appear in a direct host or a pooler username.
if [[ "$SUPABASE_DB_URL" == *zyenfobyorjfwkdgeube* ]]; then
  echo 'IDENTITY_GATE: PASS (project reference present)'
else
  echo 'IDENTITY_GATE: FAIL (expected project reference absent)'
  exit 1
fi
# Explicit URI sslmode overrides PGSSLMODE; reject disable/allow/prefer.
if [[ "$SUPABASE_DB_URL" =~ [\?\&]sslmode=([^\&]+) ]]; then
  mode="${BASH_REMATCH[1]}"
  case "$mode" in
    require|verify-ca|verify-full) echo "TLS_GATE: PASS (explicit $mode)" ;;
    *) echo 'TLS_GATE: FAIL (unsafe or unsupported URI sslmode)'; exit 1 ;;
  esac
else
  export PGSSLMODE=require
  echo 'TLS_GATE: PASS (PGSSLMODE=require enforced)'
fi
tmp="$(mktemp -d)"
trap 'rm -rf -- "$tmp"' EXIT
mkdir -p "$HOME/.ssh"
printf '%s\n' "$OPS_HOST_KEY" > "$HOME/.ssh/known_hosts"
printf '%s\n' "$OPS_KEY" > "$HOME/.ssh/id_ed25519"
chmod 600 "$HOME/.ssh/id_ed25519"
ssh_args=(-o BatchMode=yes -o StrictHostKeyChecking=yes -o ConnectTimeout=15 -i "$HOME/.ssh/id_ed25519")
pg_client(){ docker run --rm --network host -e SUPABASE_DB_URL -e PGSSLMODE -e PGCONNECT_TIMEOUT -e PGOPTIONS postgres:17 "$@"; }
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
name="aslan-supabase-$stamp.sql.gz"
echo 'STAGE: streaming pg_dump from live Supabase'
pg_client pg_dump --dbname="$SUPABASE_DB_URL" --format=plain --no-owner --no-acl --schema=public --schema=auth --schema=storage --schema=realtime --schema=cron --schema=net --schema=vault --schema=supabase_migrations | gzip -c > "$tmp/$name"
gzip -t "$tmp/$name"
test -s "$tmp/$name"
(cd "$tmp" && sha256sum "$name" > "$name.sha256")
echo 'STAGE: transfer encrypted over SSH to Contabo'
ssh "${ssh_args[@]}" "$OPS_USER@$OPS_HOST" 'umask 077; mkdir -p "$HOME/aslan-postgres-backups"; chmod 700 "$HOME/aslan-postgres-backups"'
scp "${ssh_args[@]}" "$tmp/$name" "$tmp/$name.sha256" "$OPS_USER@$OPS_HOST:aslan-postgres-backups/"
ssh "${ssh_args[@]}" "$OPS_USER@$OPS_HOST" "cd \"\$HOME/aslan-postgres-backups\" && sha256sum -c -- '$name.sha256' && gzip -t -- '$name' && stat -c 'BACKUP_BYTES: %s' -- '$name' && sha256sum -- '$name'"
echo "SOURCE_DATABASE: postgres (connection target)"
echo "BACKUP_NAME: $name"
echo 'RESULT: FILE_TRANSFER_AND_HASH_PASS; RESTORE_NOT_YET_VERIFIED'
