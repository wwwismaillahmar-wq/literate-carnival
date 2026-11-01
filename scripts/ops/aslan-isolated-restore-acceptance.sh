#!/usr/bin/env bash
# ASLAN: isolated, non-production restore acceptance. No writes to source DB.
set -euo pipefail
umask 077
: "${ASLAN_BACKUP_FILE:?Set path to a verified .sql.gz backup}"
: "${ASLAN_SOURCE_COUNTS:?Set path to trusted source inventory TSV (schema,table,rows)}"
: "${ASLAN_RESTORE_IMAGE:=postgres:17}"
[[ -r "$ASLAN_BACKUP_FILE" && -r "$ASLAN_SOURCE_COUNTS" ]] || { echo 'FAIL: missing input'; exit 1; }
for bin in docker gzip sha256sum awk sort diff mktemp; do command -v "$bin" >/dev/null || exit 1; done
gzip -t "$ASLAN_BACKUP_FILE"
work="$(mktemp -d)"
id="aslan-isolated-restore-$(date +%s)-$$"
volume="$id"
cleanup(){
  rc=$?
  docker rm -f "$id" >/dev/null 2>&1 || true
  docker volume rm "$volume" >/dev/null 2>&1 || true
  rm -rf -- "$work"
  exit "$rc"
}
trap cleanup EXIT
docker volume create "$volume" >/dev/null
password="$(head -c 48 /dev/urandom | base64 | tr -d '\n')"
docker run -d --name "$id" --network none --mount "type=volume,source=$volume,target=/var/lib/postgresql/data" -e POSTGRES_PASSWORD="$password" -e POSTGRES_USER=postgres -e POSTGRES_DB=postgres "$ASLAN_RESTORE_IMAGE" >/dev/null
unset password
ready=0
for _ in $(seq 1 90); do
  if docker exec "$id" pg_isready -U postgres -d postgres >/dev/null 2>&1; then ready=1; break; fi
  sleep 2
done
(( ready == 1 )) || { echo 'FAIL: restore database not ready'; exit 1; }
echo 'STAGE: restore isolated SQL archive'
gzip -cd "$ASLAN_BACKUP_FILE" | docker exec -i "$id" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres >/dev/null 2>"$work/restore-errors" || { echo 'FAIL: SQL restore error (details kept private)'; exit 1; }
echo 'STAGE: inventory restored user tables'
docker exec -i "$id" psql -X -qAt -v ON_ERROR_STOP=1 -U postgres -d postgres -f - <<'SQL' > "$work/restore.tsv"
SELECT format('SELECT %L, %L, count(*) FROM %I.%I;', n.nspname,c.relname,n.nspname,c.relname)
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE c.relkind IN ('r','p') AND NOT c.relispartition
AND n.nspname NOT IN ('pg_catalog','information_schema')
AND n.nspname NOT LIKE 'pg_toast%'
ORDER BY n.nspname,c.relname;
\gexec
SQL
# psql unaligned output uses pipe delimiter.
tr '|' '\t' < "$work/restore.tsv" | LC_ALL=C sort > "$work/restored.sorted"
LC_ALL=C sort "$ASLAN_SOURCE_COUNTS" > "$work/source.sorted"
source_tables="$(wc -l < "$work/source.sorted")"
restored_tables="$(wc -l < "$work/restored.sorted")"
echo "SOURCE_TABLES: $source_tables"
echo "RESTORED_TABLES: $restored_tables"
(( source_tables >= 117 )) || { echo 'FAIL: incomplete source inventory'; exit 1; }
if ! diff -q "$work/source.sorted" "$work/restored.sorted" >/dev/null; then
  echo 'RESULT: FAIL (schema/table/row counts differ)'
  exit 1
fi
echo 'RESULT: PASS (table identities and exact row counts match; isolated test volume will be removed)'
