#!/bin/bash
set -euo pipefail

if [ "$(id -u)" != 0 ] || [ "$#" -ne 1 ] ||
   [[ ! "$1" =~ ^10\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "Usage (root): configure-private-host.sh PRIVATE_IPV4" >&2
    exit 1
fi
ip=$1
install -d -m 0750 -o root -g caddy /etc/caddy/executor-tls
cd /etc/caddy/executor-tls
if [ ! -e server.crt ] && [ ! -e server.key ]; then
    umask 077
    openssl req -x509 -newkey rsa:3072 -sha256 -nodes -days 365 \
        -keyout server.key -out server.crt -subj "/CN=PrepAlgo private executor" \
        -addext "subjectAltName=IP:$ip" \
        -addext "basicConstraints=critical,CA:FALSE" \
        -addext "keyUsage=critical,digitalSignature,keyEncipherment" \
        -addext "extendedKeyUsage=serverAuth"
fi
openssl x509 -in server.crt -noout -checkip "$ip"
openssl x509 -in server.crt -noout -checkend 2592000
chown root:caddy server.key server.crt
chmod 0640 server.key
chmod 0644 server.crt
cat > /etc/caddy/Caddyfile <<EOF
https://$ip {
    bind $ip
    tls /etc/caddy/executor-tls/server.crt /etc/caddy/executor-tls/server.key
    request_body {
        max_size 256KB
    }
    reverse_proxy 127.0.0.1:8081
}
EOF
caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
systemctl enable caddy
systemctl restart caddy
curl --fail --silent --show-error --cacert server.crt "https://$ip/health/ready"
printf '\nTrust certificate: /etc/caddy/executor-tls/server.crt (public; never export server.key)\n'
