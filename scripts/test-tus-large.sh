#!/usr/bin/env bash
# Isolated Contabo loopback TUS acceptance. Writes real bytes; never run on production.
set -euo pipefail
endpoint="${TUS_TEST_ENDPOINT:-http://127.0.0.1:1080/files/}"
case "$endpoint" in http://127.0.0.1:1080/files/|http://localhost:1080/files/) ;; *) echo 'REFUSE_NON_LOOPBACK_ENDPOINT'; exit 2;; esac
size_gib="${1:-2}"
case "$size_gib" in 2|8) ;; *) echo 'Usage: test-tus-large.sh 2|8'; exit 2;; esac
bytes=$((size_gib * 1024 * 1024 * 1024))
chunk=$((16 * 1024 * 1024))
headers=$(mktemp)
payload=$(mktemp)
upload=''
cleanup() {
  if [[ -n "$upload" ]]; then curl -fsS --max-time 20 -X DELETE -H 'Tus-Resumable: 1.0.0' "$upload" >/dev/null || true; fi
  rm -f "$headers" "$payload"
}
trap cleanup EXIT
# Deterministic test bytes: real 16 MiB payload, reused across each PATCH.
head -c "$chunk" /dev/zero > "$payload"
code=$(curl -sS --max-time 30 -D "$headers" -o /dev/null -w '%{http_code}' -X POST -H 'Tus-Resumable: 1.0.0' -H "Upload-Length: $bytes" "$endpoint")
[[ "$code" == 201 ]] || { echo "CREATE_FAILED_$code"; exit 3; }
location=$(awk 'tolower($1)=="location:" {print $2}' "$headers" | tr -d '\r' | tail -n 1)
case "$location" in /files/*) upload="http://127.0.0.1:1080$location";; http://127.0.0.1:1080/files/*) upload="$location";; *) echo 'INVALID_LOCATION'; exit 4;; esac
offset=0
while (( offset < bytes )); do
  length=$((bytes-offset < chunk ? bytes-offset : chunk))
  # Deliberate client disconnect between chunks; recover offset using a new HEAD request.
  if (( offset > 0 )); then
    curl -fsS --max-time 30 -I -D "$headers" -o /dev/null -H 'Tus-Resumable: 1.0.0' "$upload"
    actual=$(awk 'tolower($1)=="upload-offset:" {print $2}' "$headers" | tr -d '\r' | tail -n 1)
    [[ "$actual" == "$offset" ]] || { echo "RESUME_OFFSET_MISMATCH_$actual"; exit 5; }
  fi
  status=$(head -c "$length" "$payload" | curl -sS --max-time 180 -o /dev/null -w '%{http_code}' -X PATCH -H 'Tus-Resumable: 1.0.0' -H 'Content-Type: application/offset+octet-stream' -H "Upload-Offset: $offset" --data-binary @- "$upload")
  [[ "$status" == 204 ]] || { echo "PATCH_FAILED_$status"; exit 6; }
  offset=$((offset+length))
done
curl -fsS --max-time 30 -I -D "$headers" -o /dev/null -H 'Tus-Resumable: 1.0.0' "$upload"
actual=$(awk 'tolower($1)=="upload-offset:" {print $2}' "$headers" | tr -d '\r' | tail -n 1)
[[ "$actual" == "$bytes" ]] || { echo "FINAL_OFFSET_MISMATCH_$actual"; exit 7; }
echo "TUS_${size_gib}GIB_REAL_TRANSFER_RESUME_PASS"
