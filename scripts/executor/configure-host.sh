#!/bin/bash
set -euo pipefail

if [ "$(id -u)" != 0 ] || [ "$#" -ne 3 ]; then
    echo "Usage (root): configure-host.sh PACKAGE_DIRECTORY DNS_HOSTNAME API_SERVICE_ACCOUNT" >&2
    exit 1
fi
package=$(realpath "$1")
script_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
domain=$2
caller=$3
if [[ ! "$domain" =~ ^[a-z0-9.-]+$ ]] ||
   [[ ! "$caller" =~ ^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.gserviceaccount\.com$ ]] ||
   [ ! -f "$package/executor-package.json" ]; then
    echo "Invalid executor deployment inputs" >&2
    exit 1
fi
if [ -e "$package/.env" ]; then
    echo "Refusing a package containing application environment" >&2
    exit 1
fi

cd "$package"
NODE_OPTIONS=--max-old-space-size=256 npm ci --omit=dev --no-audit --no-fund --ignore-scripts
docker pull python:3.11-alpine
image=$(docker image inspect python:3.11-alpine --format '{{index .RepoDigests 0}}')
if [[ ! "$image" =~ ^python@sha256:[a-f0-9]{64}$ ]]; then
    echo "Could not resolve the pulled official Python image digest" >&2
    exit 1
fi
docker image inspect "$image" >/dev/null
docker pull node:22-alpine
node_image=$(docker image inspect node:22-alpine --format '{{index .RepoDigests 0}}')
if [[ ! "$node_image" =~ ^node@sha256:[a-f0-9]{64}$ ]]; then
    echo "Could not resolve the pulled official Node image digest" >&2
    exit 1
fi
cp -a "$package/." /opt/prepalgo-executor/
chown -R root:root /opt/prepalgo-executor
chmod -R a+rX,go-w /opt/prepalgo-executor

umask 077
printf 'EXECUTOR_AUDIENCE=https://%s\nEXECUTOR_CALLERS=%s\nCODE_SANDBOX_IMAGE=%s\nCODE_SANDBOX_NODE_IMAGE=%s\n' \
    "$domain" "$caller" "$image" "$node_image" > /etc/prepalgo-executor.env
install -m 0644 "$script_dir/prepalgo-executor.service" /etc/systemd/system/prepalgo-executor.service
install -m 0644 "$script_dir/Caddyfile" /etc/caddy/Caddyfile
mkdir -p /etc/systemd/system/caddy.service.d
printf '[Service]\nEnvironment=EXECUTOR_DOMAIN=%s\n' "$domain" \
    > /etc/systemd/system/caddy.service.d/prepalgo.conf
chmod 0644 /etc/systemd/system/caddy.service.d/prepalgo.conf
systemctl daemon-reload
EXECUTOR_DOMAIN="$domain" caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
systemctl enable --now prepalgo-executor
echo "Executor installed; HTTPS proxy is intentionally stopped until DNS is ready."
echo "Pinned image: $image"
