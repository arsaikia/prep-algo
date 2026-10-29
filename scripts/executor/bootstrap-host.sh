#!/bin/bash
set -euo pipefail

if [ "$(id -u)" != 0 ]; then
    echo "Run as root on the dedicated Ubuntu executor host" >&2
    exit 1
fi
if [ "$(uname -m)" != x86_64 ]; then
    echo "This bootstrap supports only the approved x86_64 GCE host" >&2
    exit 1
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq ca-certificates curl xz-utils docker.io caddy unattended-upgrades
# Wait for DNS before starting HTTPS certificate issuance.
systemctl disable --now caddy
systemctl enable --now docker

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
cd "$work"
curl --fail --silent --show-error --proto '=https' --tlsv1.2 \
    https://nodejs.org/dist/latest-v22.x/SHASUMS256.txt -o SHASUMS256.txt
archive=$(awk '$2 ~ /^node-v22\.[0-9]+\.[0-9]+-linux-x64\.tar\.xz$/ { print $2 }' SHASUMS256.txt)
if [ -z "$archive" ] || [ "$(printf '%s\n' "$archive" | wc -l)" -ne 1 ]; then
    echo "Could not determine one supported Node 22 archive" >&2
    exit 1
fi
curl --fail --silent --show-error --proto '=https' --tlsv1.2 \
    "https://nodejs.org/dist/latest-v22.x/$archive" -o "$archive"
grep "  $archive\$" SHASUMS256.txt | sha256sum --check -
mkdir -p /opt/prepalgo-node
tar -xJf "$archive" --strip-components=1 -C /opt/prepalgo-node
ln -sfn /opt/prepalgo-node/bin/node /usr/bin/node
ln -sfn /opt/prepalgo-node/bin/npm /usr/bin/npm

if ! id prepalgo-executor >/dev/null 2>&1; then
    useradd --system --user-group --home-dir /nonexistent --shell /usr/sbin/nologin prepalgo-executor
fi
usermod -aG docker prepalgo-executor
mkdir -p /opt/prepalgo-executor
chmod 0755 /opt/prepalgo-executor
node --version
docker --version
