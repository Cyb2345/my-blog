#!/usr/bin/env bash
# Requests and installs a publicly trusted short-lived certificate for PUBLIC_IP.
# The ACME client runs on the Actions runner because some production networks
# cannot reach the Let's Encrypt directory directly.
set -euo pipefail

: "${SERVER_HOST:?}" "${SERVER_USER:?}" "${SERVER_SSH_KEY:?}" "${SERVER_KNOWN_HOSTS:?}"
: "${PUBLIC_IP:?}" "${CERTBOT_BIN:?}" "${DEPLOY_PATH:?}"
SERVER_PORT=${SERVER_PORT:-22}

[[ $SERVER_HOST =~ ^[a-zA-Z0-9][a-zA-Z0-9.-]*$ ]]
[[ $SERVER_USER =~ ^[a-zA-Z_][a-zA-Z0-9_-]*$ ]]
[[ $SERVER_PORT =~ ^[0-9]+$ ]]
[[ $PUBLIC_IP =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]]
[[ $DEPLOY_PATH =~ ^/[a-zA-Z0-9_/-]+$ && $DEPLOY_PATH != / ]]
[[ -x $CERTBOT_BIN ]]

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
printf '%s\n' "$SERVER_SSH_KEY" > "$work/key"
printf '%s\n' "$SERVER_KNOWN_HOSTS" > "$work/known_hosts"
chmod 600 "$work/key" "$work/known_hosts"

ssh_options=(
  -i "$work/key"
  -o BatchMode=yes
  -o StrictHostKeyChecking=yes
  -o "UserKnownHostsFile=$work/known_hosts"
  -o ConnectTimeout=20
  -o ServerAliveInterval=15
  -o ServerAliveCountMax=4
)
target="$SERVER_USER@$SERVER_HOST"

remote_paths=$(ssh "${ssh_options[@]}" -p "$SERVER_PORT" "$target" \
  "cert_root=\$(docker inspect blog-traefik --format '{{range .Mounts}}{{if eq .Destination \"/etc/letsencrypt\"}}{{.Source}}{{end}}{{end}}'); webroot=\$(docker inspect blog-acme-challenge --format '{{range .Mounts}}{{if eq .Destination \"/var/www/certbot\"}}{{.Source}}{{end}}{{end}}'); printf '%s\\n%s\\n' \"\$cert_root\" \"\$webroot\"")
cert_root=$(printf '%s\n' "$remote_paths" | sed -n '1p')
webroot=$(printf '%s\n' "$remote_paths" | sed -n '2p')
[[ $cert_root =~ ^/var/lib/docker/volumes/[a-zA-Z0-9_.-]+/_data$ ]]
[[ $webroot =~ ^/var/lib/docker/volumes/[a-zA-Z0-9_.-]+/_data$ ]]

# Preserve the ACME account and lineage between ephemeral runners.
mkdir -p "$work/state"
ssh "${ssh_options[@]}" -p "$SERVER_PORT" "$target" \
  "tar -C '$cert_root' -czf - ." | tar -C "$work/state" -xzf -

# Certbot stores absolute lineage paths. Point the selected lineage at this
# runner's temporary state directory while it is in use here.
renewal_config="$work/state/renewal/$PUBLIC_IP.conf"
if [[ -f $renewal_config ]]; then
  sed -i.bak \
    -e "s#^archive_dir = .*#archive_dir = $work/state/archive/$PUBLIC_IP#" \
    -e "s#^cert = .*#cert = $work/state/live/$PUBLIC_IP/cert.pem#" \
    -e "s#^privkey = .*#privkey = $work/state/live/$PUBLIC_IP/privkey.pem#" \
    -e "s#^chain = .*#chain = $work/state/live/$PUBLIC_IP/chain.pem#" \
    -e "s#^fullchain = .*#fullchain = $work/state/live/$PUBLIC_IP/fullchain.pem#" \
    "$renewal_config"
  unlink "$renewal_config.bak"
fi

export IP_CERT_SSH_KEY="$work/key"
export IP_CERT_KNOWN_HOSTS="$work/known_hosts"
export IP_CERT_TARGET="$target"
export IP_CERT_PORT="$SERVER_PORT"
export IP_CERT_WEBROOT="$webroot"

cat > "$work/auth-hook.sh" <<'HOOK'
#!/usr/bin/env bash
set -euo pipefail
[[ ${CERTBOT_TOKEN:?} =~ ^[A-Za-z0-9_-]+$ ]]
remote_file="$IP_CERT_WEBROOT/.well-known/acme-challenge/$CERTBOT_TOKEN"
ssh -i "$IP_CERT_SSH_KEY" -o BatchMode=yes -o StrictHostKeyChecking=yes \
  -o "UserKnownHostsFile=$IP_CERT_KNOWN_HOSTS" -p "$IP_CERT_PORT" "$IP_CERT_TARGET" \
  "install -d -m 755 '$IP_CERT_WEBROOT/.well-known/acme-challenge' && cat > '$remote_file' && chmod 644 '$remote_file'" \
  <<<"${CERTBOT_VALIDATION:?}"
served=$(curl --fail --silent --show-error --max-time 20 \
  "http://$CERTBOT_DOMAIN/.well-known/acme-challenge/$CERTBOT_TOKEN")
[[ $served == "$CERTBOT_VALIDATION" ]]
HOOK

cat > "$work/cleanup-hook.sh" <<'HOOK'
#!/usr/bin/env bash
set -euo pipefail
[[ ${CERTBOT_TOKEN:?} =~ ^[A-Za-z0-9_-]+$ ]]
remote_file="$IP_CERT_WEBROOT/.well-known/acme-challenge/$CERTBOT_TOKEN"
ssh -i "$IP_CERT_SSH_KEY" -o BatchMode=yes -o StrictHostKeyChecking=yes \
  -o "UserKnownHostsFile=$IP_CERT_KNOWN_HOSTS" -p "$IP_CERT_PORT" "$IP_CERT_TARGET" \
  "unlink '$remote_file' 2>/dev/null || true"
HOOK
chmod 700 "$work/auth-hook.sh" "$work/cleanup-hook.sh"

"$CERTBOT_BIN" certonly \
  --non-interactive --agree-tos --register-unsafely-without-email \
  --manual --preferred-challenges http \
  --manual-auth-hook "$work/auth-hook.sh" \
  --manual-cleanup-hook "$work/cleanup-hook.sh" \
  --preferred-profile shortlived \
  --ip-address "$PUBLIC_IP" --cert-name "$PUBLIC_IP" \
  --keep-until-expiring \
  --config-dir "$work/state" \
  --work-dir "$work/certbot-work" \
  --logs-dir "$work/certbot-logs"

renewal_config="$work/state/renewal/$PUBLIC_IP.conf"
[[ -f $renewal_config ]]
sed -i.bak \
  -e "s#^archive_dir = .*#archive_dir = /etc/letsencrypt/archive/$PUBLIC_IP#" \
  -e "s#^cert = .*#cert = /etc/letsencrypt/live/$PUBLIC_IP/cert.pem#" \
  -e "s#^privkey = .*#privkey = /etc/letsencrypt/live/$PUBLIC_IP/privkey.pem#" \
  -e "s#^chain = .*#chain = /etc/letsencrypt/live/$PUBLIC_IP/chain.pem#" \
  -e "s#^fullchain = .*#fullchain = /etc/letsencrypt/live/$PUBLIC_IP/fullchain.pem#" \
  "$renewal_config"
unlink "$renewal_config.bak"
[[ -s $work/state/live/$PUBLIC_IP/fullchain.pem ]]
[[ -s $work/state/live/$PUBLIC_IP/privkey.pem ]]

# Update the mounted certificate volume in place, then reload Traefik.
tar -C "$work/state" -czf - . | ssh "${ssh_options[@]}" -p "$SERVER_PORT" "$target" \
  "tar --overwrite -C '$cert_root' -xzf - && chmod 600 '$cert_root/live/$PUBLIC_IP/privkey.pem' && current=\$(cat '$DEPLOY_PATH/current-sha') && touch '$DEPLOY_PATH/releases/'\"\$current\"'/traefik-dynamic/tls.yml' && docker restart blog-traefik >/dev/null"

sleep 3
curl --fail --silent --show-error --max-time 20 "https://$PUBLIC_IP/" >/dev/null
echo "Trusted IP certificate is active for $PUBLIC_IP"
