#!/usr/bin/env bash
# Deploys only the ASLAN academy file gateway. Does not replace the website or old tusd.
set -Eeuo pipefail
: "${ASLAN_SHA:?Missing commit SHA}"
[[ "$ASLAN_SHA" =~ ^[a-f0-9]{40}$ ]] || exit 2
base="$HOME/aslan-academy-uploads"
release="$base/releases/$ASLAN_SHA"
test -f "$release/infra/uploads/academy-gateway.mjs"
test -s "$base/gateway.env"
docker info >/dev/null
available=$(df -PB1 "$base" | awk 'NR==2 {print $4}')
[[ "$available" -gt 12884901888 ]] || { echo 'BLOCKED_UPLOAD_DISK_UNDER_12GIB'; exit 50; }

# Real disk/network transfer, mid-PATCH abort, process restart and full SHA-256.
# The test listener stays on loopback with an injected test identity, never public.
cd "$release"
reuse=0
if docker container inspect aslan-academy-upload >/dev/null 2>&1; then
  previous_source=$(docker inspect -f '{{range .Mounts}}{{if eq .Destination "/app/gateway.mjs"}}{{.Source}}{{end}}{{end}}' aslan-academy-upload)
  previous_sha=$(docker inspect -f '{{index .Config.Labels "aslan.sha"}}' aslan-academy-upload)
  previous_managed=$(docker inspect -f '{{index .Config.Labels "aslan.managed"}}' aslan-academy-upload)
  case "$previous_source" in
    "$base"/releases/*/infra/uploads/academy-gateway.mjs)
      previous_release=${previous_source%/infra/uploads/academy-gateway.mjs}
      if [[ "$previous_managed" = academy-upload ]] && \
        cmp -s "$previous_source" "$release/infra/uploads/academy-gateway.mjs" && \
        cmp -s "$previous_release/tests/uploads/contabo-gateway.test.mjs" "$release/tests/uploads/contabo-gateway.test.mjs"; then reuse=1; fi
      ;;
  esac
fi
if [[ "$reuse" = 1 ]]; then
  # This managed service can only have been deployed after the same large tests
  # passed. Reuse their evidence when only DNS/deployment wiring changed.
  node --test tests/uploads/contabo-gateway.test.mjs
  echo "CONTABO_2_8_GIB_EVIDENCE_REUSED_FROM_DEPLOYED_SHA=$previous_sha"
else
  ASLAN_LARGE_TRANSFER=1 node --test tests/uploads/contabo-gateway.test.mjs
  echo 'CONTABO_2_AND_8_GIB_TRANSFER_SHA256_RESUME_PASS'
fi

mkdir -p "$base/data"
chmod 700 "$base/data"
docker pull node:22.20.0-alpine >/dev/null
image=$(docker image inspect node:22.20.0-alpine --format '{{index .RepoDigests 0}}')
test -n "$image"
old=''
if docker container inspect aslan-academy-upload >/dev/null 2>&1; then
  managed=$(docker inspect -f '{{index .Config.Labels "aslan.managed"}}' aslan-academy-upload)
  [[ "$managed" = 'academy-upload' ]] || { echo 'BLOCKED_UNMANAGED_CONTAINER'; exit 51; }
  deployed=$(docker inspect -f '{{index .Config.Labels "aslan.sha"}}' aslan-academy-upload)
  if [[ "$deployed" != "$ASLAN_SHA" ]]; then
    old="aslan-academy-upload-rollback-$ASLAN_SHA"
    docker stop --time 30 aslan-academy-upload >/dev/null
    docker rename aslan-academy-upload "$old"
  fi
fi
if ! docker container inspect aslan-academy-upload >/dev/null 2>&1; then
  if ! docker run -d --name aslan-academy-upload --restart unless-stopped \
    --label aslan.managed=academy-upload --label "aslan.sha=$ASLAN_SHA" \
    --user "$(id -u):$(id -g)" --read-only --tmpfs /tmp:size=16m,noexec,nosuid \
    --cap-drop ALL --security-opt no-new-privileges:true --pids-limit 64 --memory 512m \
    -p 127.0.0.1:9191:9191 --env-file "$base/gateway.env" \
    -e HOST=0.0.0.0 -e PORT=9191 -e ASLAN_UPLOAD_DIRECTORY=/data \
    -v "$base/data:/data" -v "$release/infra/uploads/academy-gateway.mjs:/app/gateway.mjs:ro" \
    "$image" node /app/gateway.mjs >/dev/null; then
    if [[ -n "$old" ]]; then docker rename "$old" aslan-academy-upload; docker start aslan-academy-upload >/dev/null; fi
    exit 52
  fi
fi
ready=0
for attempt in $(seq 1 20); do
  if curl -fsS --max-time 3 http://127.0.0.1:9191/health > "$base/health.json"; then ready=1; break; fi
  sleep 1
done
if [[ "$ready" != 1 ]]; then
  echo 'GATEWAY_HEALTH_FAILED'
  docker logs --tail 15 aslan-academy-upload
  if [[ -n "$old" ]]; then
    docker rm -f aslan-academy-upload >/dev/null
    docker rename "$old" aslan-academy-upload
    docker start aslan-academy-upload >/dev/null
  fi
  exit 53
fi
code=$(curl -sS --max-time 10 -o /dev/null -w '%{http_code}' -I http://127.0.0.1:9191/files/5dd358cf-6c5c-4b6b-8901-3f6e2d33f7c0)
[[ "$code" = 401 ]] || { echo "GATEWAY_AUTH_DENIAL_FAILED_$code"; exit 54; }
echo 'CONTABO_AUTHENTICATED_GATEWAY_LOOPBACK_PASS'

# Use only a hostname already belonging to this server. Never invent a domain.
candidate="${ASLAN_UPLOAD_HOSTNAME:-$(hostname -f)}"
if [[ -f "$base/hostname" ]]; then candidate=$(cat "$base/hostname"); fi
# Some Contabo images use a short kernel hostname. Resolve an existing PTR,
# then require forward DNS to match this server; no new DNS record is created.
if ! [[ "$candidate" =~ ^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$ ]]; then
  for address in $(hostname -I); do
    ptr=$(getent hosts "$address" | awk 'NR==1 {print $2}' || true)
    if [[ "$ptr" =~ ^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$ ]]; then candidate="$ptr"; break; fi
  done
fi
if ! [[ "$candidate" =~ ^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$ ]]; then
  echo 'BLOCKED_PUBLIC_TLS_HOSTNAME_REQUIRED'
  echo "SERVER_HOSTNAME=$candidate"
  exit 55
fi
# Query DNS directly: /etc/hosts may map the kernel hostname to 127.0.1.1.
dns_address() {
  node - "$1" <<'NODE'
const dns=require('node:dns').promises,net=require('node:net'),host=process.argv[2];
if(net.isIP(host)===4){console.log(host);}else{
  setTimeout(()=>process.exit(0),5000).unref();
  dns.resolve4(host).then(rows=>{if(rows[0])console.log(rows[0]);}).catch(()=>{});
}
NODE
}
resolved=$(dns_address "$candidate")
# A NAT/public address may differ from hostname -I. The already verified SSH
# target is another authoritative address for this same server.
ssh_target=$(sed -n 's/^ASLAN_UPLOAD_EXPECTED_HOST=//p' "$base/gateway.env")
expected=''
if [[ "$ssh_target" =~ ^[A-Za-z0-9.-]+$ ]]; then expected=$(dns_address "$ssh_target"); fi
matches_server() { [[ -n "$1" ]] && { [[ "$1" = "$expected" ]] || hostname -I | tr ' ' '\n' | grep -Fxq "$1"; }; }
if ! matches_server "$resolved"; then
  for address in "$expected" $(hostname -I); do
    [[ -n "$address" ]] || continue
    ptr=$(getent hosts "$address" | awk '{for(i=2;i<=NF;i++) if($i ~ /\./){print $i;exit}}' || true)
    [[ "$ptr" =~ ^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$ ]] || continue
    ptr_address=$(dns_address "$ptr")
    if matches_server "$ptr_address"; then candidate="$ptr"; resolved="$ptr_address"; break; fi
  done
fi
if ! matches_server "$resolved"; then
  echo 'BLOCKED_PUBLIC_TLS_HOSTNAME_DNS_MISMATCH'
  echo "SERVER_HOSTNAME=$candidate"
  exit 56
fi
if ! docker container inspect aslan-academy-upload-tls >/dev/null 2>&1; then
  if ss -lntH | awk '{print $4}' | grep -Eq ':(80|443)$'; then
    echo 'BLOCKED_EXISTING_TLS_PROXY_NEEDS_UPLOAD_ROUTE'
    echo "SERVER_HOSTNAME=$candidate"
    docker ps --format '{{.Names}} {{.Ports}}'
    exit 57
  fi
  cat > "$base/Caddyfile" <<CADDY
$candidate {
  reverse_proxy 127.0.0.1:9191
}
CADDY
  mkdir -p "$base/caddy-data" "$base/caddy-config"
  docker pull caddy:2.10.2-alpine >/dev/null
  caddy_image=$(docker image inspect caddy:2.10.2-alpine --format '{{index .RepoDigests 0}}')
  docker run -d --name aslan-academy-upload-tls --restart unless-stopped \
    --label aslan.managed=academy-upload-tls --network host --read-only \
    --cap-drop ALL --cap-add NET_BIND_SERVICE --security-opt no-new-privileges:true \
    -v "$base/Caddyfile:/etc/caddy/Caddyfile:ro" \
    -v "$base/caddy-data:/data" -v "$base/caddy-config:/config" "$caddy_image" >/dev/null
fi
for attempt in $(seq 1 30); do
  if curl -fsS --max-time 5 "https://$candidate/health" > "$base/public-health.json"; then
    printf '%s\n' "$candidate" > "$base/hostname"
    echo "CONTABO_PUBLIC_UPLOAD_URL=https://$candidate"
    echo 'CONTABO_PUBLIC_TLS_GATEWAY_PASS'
    exit 0
  fi
  sleep 2
done
echo 'BLOCKED_PUBLIC_TLS_CERTIFICATE_OR_NETWORK'
echo "SERVER_HOSTNAME=$candidate"
exit 58
