#!/usr/bin/env bash
set -Eeuo pipefail
# Run ONCE from an authorized Contabo console by a human with administrative rights.
# Does not change SSH daemon config, firewall, databases, containers, or application deployments.
if [[ "$EUID" -ne 0 ]]; then echo "Run as root from an authorized console"; exit 1; fi
if [[ -z "${ASLAN_OPS_PUBLIC_KEY:-}" ]]; then echo "Set ASLAN_OPS_PUBLIC_KEY to a NEW dedicated ed25519 public key"; exit 1; fi
if [[ ! "$ASLAN_OPS_PUBLIC_KEY" =~ ^ssh-ed25519[[:space:]] ]]; then echo "Expected ssh-ed25519 public key"; exit 1; fi
if ! id aslan-ops >/dev/null 2>&1; then useradd --create-home --shell /bin/bash aslan-ops; fi
install -d -m 700 -o aslan-ops -g aslan-ops /home/aslan-ops/.ssh
keyfile=/home/aslan-ops/.ssh/authorized_keys
touch "$keyfile"; chown aslan-ops:aslan-ops "$keyfile"; chmod 600 "$keyfile"
if ! grep -Fxq "$ASLAN_OPS_PUBLIC_KEY" "$keyfile"; then printf '%s\n' "$ASLAN_OPS_PUBLIC_KEY" >> "$keyfile"; fi
# Health script is read-only in its intended behavior; grant narrowly scoped sudo.
install -d -m 755 /opt/aslan-ops
install -m 755 scripts/ops/contabo-health.sh /opt/aslan-ops/health.sh
printf '%s\n' 'aslan-ops ALL=(root) NOPASSWD: /opt/aslan-ops/health.sh' > /etc/sudoers.d/aslan-ops-health
chmod 440 /etc/sudoers.d/aslan-ops-health
visudo -cf /etc/sudoers.d/aslan-ops-health
echo "ASLAN OPS BOOTSTRAP COMPLETE — only health command authorized; no deploy rights"
