#!/bin/bash
# Patch the private executor VM: run quarterly, and out of cycle for urgent
# kernel/Docker/runc/Node fixes. Run from a workstation with gcloud access.
#
#   scripts/executor/patch-window.sh           # temporary IP, patch, reboot if needed, verify
#   scripts/executor/patch-window.sh --check   # verify only; no IP, no changes
#
# Outbound access exists only while an ephemeral IP is attached (~$0.005/hour).
# The IP is removed on every exit path. Inbound stays blocked by
# prepalgo-executor-deny-other, and sandboxed submissions run with no network.
set -euo pipefail

PROJECT=${PROJECT:-prepalgo}
ZONE=${ZONE:-us-central1-a}
VM=${VM:-prepalgo-executor}
PRIVATE_IP=${PRIVATE_IP:-10.128.0.2}
ACCESS=patch-window
mode=${1:-patch}
if [ "$mode" != patch ] && [ "$mode" != --check ]; then
    echo "Usage: $0 [--check]" >&2
    exit 2
fi

g() { gcloud --project="$PROJECT" --quiet "$@"; }
remote() { g compute ssh "$VM" --zone="$ZONE" --tunnel-through-iap --command='sudo bash -s'; }
access_configs() {
    g compute instances describe "$VM" --zone="$ZONE" \
        --format='value(networkInterfaces[0].accessConfigs[].name)'
}

VERIFY=$(cat <<EOF
set -euo pipefail
systemctl is-active --quiet docker caddy prepalgo-executor
image=\$(sed -n 's/^CODE_SANDBOX_IMAGE=//p' /etc/prepalgo-executor.env)
[[ "\$image" =~ ^python@sha256:[a-f0-9]{64}\$ ]]
docker image inspect "\$image" >/dev/null
node_image=\$(sed -n 's/^CODE_SANDBOX_NODE_IMAGE=//p' /etc/prepalgo-executor.env)
[[ "\$node_image" =~ ^node@sha256:[a-f0-9]{64}\$ ]]
docker image inspect "\$node_image" >/dev/null
curl --fail --silent --show-error --max-time 10 \
    --cacert /etc/caddy/executor-tls/server.crt "https://$PRIVATE_IP/health/ready" >/dev/null
echo "kernel \$(uname -r), node \$(node --version), docker \$(docker version --format '{{.Server.Version}}')"
echo "certificate \$(openssl x509 -in /etc/caddy/executor-tls/server.crt -noout -enddate)"
if ! openssl x509 -in /etc/caddy/executor-tls/server.crt -noout -checkend 3888000 >/dev/null; then
    echo "WARNING: executor certificate expires within 45 days; run rotate-cert.sh"
fi
if [ -f /var/run/reboot-required ]; then echo "REBOOT_REQUIRED"; fi
echo "executor healthy"
EOF
)

if [ "$mode" = --check ]; then
    remote <<<"$VERIFY"
    exit 0
fi

# Inbound must stay closed while the VM has a public address.
deny=$(g compute firewall-rules describe prepalgo-executor-deny-other \
    --format='value(disabled,priority,sourceRanges.list(),targetTags.list())')
if [ "$deny" != $'False\t1100\t0.0.0.0/0\tprepalgo-executor' ]; then
    echo "Refusing: firewall rule prepalgo-executor-deny-other is missing or changed ($deny)" >&2
    exit 1
fi
if [ -n "$(access_configs)" ]; then
    echo "Refusing: $VM already has an external access config; investigate first" >&2
    exit 1
fi

cleanup() {
    if access_configs | grep -qx "$ACCESS"; then
        if g compute instances delete-access-config "$VM" --zone="$ZONE" --access-config-name="$ACCESS"; then
            echo "Temporary IP removed."
        else
            echo "ERROR: remove it now: gcloud compute instances delete-access-config $VM" \
                "--project=$PROJECT --zone=$ZONE --access-config-name=$ACCESS" >&2
        fi
    fi
}
trap cleanup EXIT
trap 'exit 130' INT TERM

echo "Attaching temporary IP..."
g compute instances add-access-config "$VM" --zone="$ZONE" --access-config-name="$ACCESS"

out=$(remote <<'EOF' | tee /dev/stderr
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
for _ in $(seq 1 30); do
    curl --fail --silent --max-time 5 -o /dev/null https://nodejs.org/dist/ && break
    sleep 2
done
apt-get update -qq
apt-get -y -qq -o Dpkg::Options::=--force-confdef -o Dpkg::Options::=--force-confold full-upgrade
apt-get -y -qq autoremove --purge

# Node is a checksum-verified tarball, so apt does not update it.
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
cd "$work"
curl --fail --silent --show-error --proto '=https' --tlsv1.2 \
    https://nodejs.org/dist/latest-v22.x/SHASUMS256.txt -o SHASUMS256.txt
archive=$(awk '$2 ~ /^node-v22\.[0-9]+\.[0-9]+-linux-x64\.tar\.xz$/ { print $2 }' SHASUMS256.txt)
[ -n "$archive" ] && [ "$(printf '%s\n' "$archive" | wc -l)" -eq 1 ]
if [ "node-$(node --version)-linux-x64.tar.xz" != "$archive" ]; then
    curl --fail --silent --show-error --proto '=https' --tlsv1.2 \
        "https://nodejs.org/dist/latest-v22.x/$archive" -o "$archive"
    grep "  $archive\$" SHASUMS256.txt | sha256sum --check --quiet -
    rm -rf /opt/prepalgo-node.next /opt/prepalgo-node.prev
    mkdir /opt/prepalgo-node.next
    tar -xJf "$archive" --strip-components=1 -C /opt/prepalgo-node.next
    mv /opt/prepalgo-node /opt/prepalgo-node.prev
    mv /opt/prepalgo-node.next /opt/prepalgo-node
    echo "Node updated to ${archive#node-}; previous kept in /opt/prepalgo-node.prev"
fi
systemctl restart prepalgo-executor
if [ -f /var/run/reboot-required ]; then echo "REBOOT_REQUIRED"; fi
EOF
)

# Drop outbound access before rebooting; nothing after this needs the internet.
cleanup

if grep -q REBOOT_REQUIRED <<<"$out"; then
    echo "Rebooting (grading is unavailable for about a minute)..."
    remote <<<'systemctl reboot' || true
    sleep 20
    for _ in $(seq 1 30); do
        remote <<<'systemctl is-system-running --wait >/dev/null || true' 2>/dev/null && break
        sleep 10
    done
fi

for _ in $(seq 1 12); do
    if remote <<<"$VERIFY"; then
        [ -z "$(access_configs)" ] || { echo "ERROR: external access config still attached" >&2; exit 1; }
        echo "Patch window complete."
        exit 0
    fi
    sleep 10
done
echo "ERROR: executor did not become healthy; inspect with: gcloud compute ssh $VM --project=$PROJECT --zone=$ZONE --tunnel-through-iap" >&2
exit 1
