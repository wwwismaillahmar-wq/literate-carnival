#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
echo "ASLAN health check $(date -u +%FT%TZ)"
if ! command -v docker >/dev/null 2>&1; then echo "FAIL: docker missing"; exit 2; fi
for name in aslan-postgres aslan-storage; do
  if ! docker inspect "$name" >/dev/null 2>&1; then echo "FAIL: $name missing"; exit 2; fi
  state="$(docker inspect -f '{{.State.Running}}' "$name")"
  if [[ "$state" != true ]]; then echo "FAIL: $name not running"; exit 2; fi
  echo "OK: $name running"
done
docker exec aslan-postgres pg_isready -U aslan -d postgres >/dev/null || { echo "FAIL: PostgreSQL not ready"; exit 2; }
echo "OK: PostgreSQL ready"
df -P / | awk 'NR==2 {gsub(/%/,"",$5); if($5>=90){print "FAIL: root disk "$5"%";exit 2}else{print "OK: root disk "$5"%"}}'
echo "RESULT: PASS"
