#!/usr/bin/env bash
set -euo pipefail
umask 077
: "${SUPABASE_DB_URL:?SUPABASE_DB_URL is required}"
export PGCONNECT_TIMEOUT=15 PGOPTIONS='-c default_transaction_read_only=on'
# Do not emit connection strings, including raw psql errors which may echo them.
[[ "$SUPABASE_DB_URL" != *$'\n'* && "$SUPABASE_DB_URL" != *$'\r'* ]] || { echo 'URI_GATE: FAIL (embedded newline)'; exit 1; }
[[ "$SUPABASE_DB_URL" == *zyenfobyorjfwkdgeube* ]] || { echo 'URI_GATE: FAIL (project mismatch)'; exit 1; }
if [[ "$SUPABASE_DB_URL" =~ [\?\&]sslmode=([^\&]*) ]]; then
  case "${BASH_REMATCH[1]}" in
    require|verify-ca|verify-full) ;;
    *) echo 'TLS_GATE: FAIL (unsafe or malformed sslmode)'; exit 1 ;;
  esac
else
  export PGSSLMODE=require
fi
err="$(mktemp)"
trap 'rm -f "$err"' EXIT
run_sql(){
  local result rc
  if result="$(psql "$SUPABASE_DB_URL" -X -qAt -v ON_ERROR_STOP=1 -c "$1" 2>"$err")"; then
    printf '%s' "$result"
  else
    rc=$?
    echo "PSQL_GATE: FAIL (exit=$rc)" >&2
    # Classify errors without exposing credentials or host identifiers.
    if grep -qi 'password authentication failed' "$err"; then echo 'DIAG: authentication_failed' >&2
    elif grep -qi 'could not translate host name' "$err"; then echo 'DIAG: dns_failed' >&2
    elif grep -qi 'timeout\|timed out' "$err"; then echo 'DIAG: connection_timeout' >&2
    elif grep -qi 'does not exist' "$err"; then echo 'DIAG: database_or_role_missing' >&2
    elif grep -qi 'permission denied' "$err"; then echo 'DIAG: permission_denied' >&2
    else echo 'DIAG: unclassified_psql_error (raw error withheld for credential safety)' >&2; fi
    return "$rc"
  fi
}
version="$(run_sql 'SHOW server_version;')" || exit 1
echo "SERVER_VERSION: $version"
result="$(run_sql "SELECT current_database() || '|' || (SELECT ssl::text FROM pg_stat_ssl WHERE pid=pg_backend_pid());")" || exit 1
case "$result" in
  postgres\|t|postgres\|true) echo 'CONNECTION_GATE: PASS'; echo 'TLS_GATE: PASS' ;;
  *) echo 'CONNECTION_GATE: FAIL (unexpected database or TLS state)'; exit 1 ;;
esac
bool="$(run_sql 'SELECT 1=1;')" || exit 1
case "$bool" in t|true) echo 'BOOLEAN_GATE: PASS' ;; *) echo 'BOOLEAN_GATE: FAIL'; exit 1 ;; esac
inventory="$(run_sql "SELECT count(*) || '|' || count(DISTINCT n.nspname) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind IN ('r','p') AND NOT c.relispartition AND n.nspname IN ('public','auth','storage','realtime','cron','net','vault','supabase_migrations');")" || exit 1
IFS='|' read -r tables schemas <<< "$inventory"
echo "SOURCE_TABLES: $tables"
echo "SOURCE_SCHEMAS: $schemas"
[[ "$tables" == 117 && "$schemas" == 8 ]] || { echo 'INVENTORY_GATE: FAIL (expected 117 tables in 8 schemas)'; exit 1; }
echo 'RESULT: ISOLATED_VERIFICATION_PASS'
