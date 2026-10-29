#!/bin/bash
# Rotate the private executor's self-signed TLS certificate without downtime.
# Runs as root on the VM; pipe it over IAP from a workstation:
#
#   gcloud compute ssh prepalgo-executor --project=prepalgo --zone=us-central1-a \
#       --tunnel-through-iap --command='sudo bash -s -- stage 10.128.0.2' \
#       < scripts/executor/rotate-cert.sh
#
# Commands: status | stage IP | activate IP
#   stage     create next.key/next.crt (inactive) and print the public next.crt
#   activate  switch Caddy to next.*, keeping prev.* for rollback
# Release a backend trusting old+new between stage and activate; see ADR-008.
set -euo pipefail

cmd=${1:-}
ip=${2:-}
dir=/etc/caddy/executor-tls
if [ "$(id -u)" != 0 ]; then echo "Run as root" >&2; exit 1; fi
cd "$dir"

case "$cmd" in
status)
    for f in server.crt next.crt prev.crt; do
        [ -e "$f" ] && echo "$f $(openssl x509 -in "$f" -noout -enddate)"
    done
    ;;
stage)
    [[ "$ip" =~ ^10\.[0-9]+\.[0-9]+\.[0-9]+$ ]] || { echo "Usage: stage PRIVATE_IPV4" >&2; exit 2; }
    if [ ! -e next.crt ]; then
        umask 077
        openssl req -x509 -newkey rsa:3072 -sha256 -nodes -days 365 \
            -keyout next.key -out next.crt -subj "/CN=PrepAlgo private executor" \
            -addext "subjectAltName=IP:$ip" \
            -addext "basicConstraints=critical,CA:FALSE" \
            -addext "keyUsage=critical,digitalSignature,keyEncipherment" \
            -addext "extendedKeyUsage=serverAuth" 2>/dev/null
        chown root:caddy next.key next.crt
        chmod 0640 next.key
        chmod 0644 next.crt
    fi
    openssl x509 -in next.crt -noout -checkip "$ip" >/dev/null
    openssl x509 -in next.crt -noout -enddate >&2
    cat next.crt
    ;;
activate)
    [[ "$ip" =~ ^10\.[0-9]+\.[0-9]+\.[0-9]+$ ]] || { echo "Usage: activate PRIVATE_IPV4" >&2; exit 2; }
    [ -e next.crt ] && [ -e next.key ] || { echo "Nothing staged" >&2; exit 1; }
    openssl x509 -in next.crt -noout -checkip "$ip" >/dev/null
    [ "$(openssl x509 -in next.crt -noout -pubkey)" = "$(openssl pkey -in next.key -pubout)" ] ||
        { echo "next.key does not match next.crt" >&2; exit 1; }
    cp -p server.crt prev.crt
    cp -p server.key prev.key
    mv next.crt server.crt
    mv next.key server.key
    if caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null 2>&1 &&
        systemctl restart caddy &&
        sleep 2 &&
        curl --fail --silent --show-error --max-time 10 --cacert server.crt "https://$ip/health/ready" >/dev/null; then
        echo "Activated: $(openssl x509 -in server.crt -noout -enddate). Rollback copy: prev.*"
    else
        mv server.crt next.crt
        mv server.key next.key
        cp -p prev.crt server.crt
        cp -p prev.key server.key
        systemctl restart caddy
        echo "Activation failed; restored the previous certificate" >&2
        exit 1
    fi
    ;;
*)
    echo "Usage: rotate-cert.sh status | stage PRIVATE_IPV4 | activate PRIVATE_IPV4" >&2
    exit 2
    ;;
esac
