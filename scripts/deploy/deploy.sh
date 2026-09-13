#!/usr/bin/env bash
# Runs on the server. No builds, git checkout, dependency installs, or volume pruning.
set -euo pipefail
root=${1:?Deployment directory required}
prefix=${2:?Image prefix required}
sha=${3:?Full commit SHA required}
[[ $root == /* && $root != / ]]
[[ $sha =~ ^[0-9a-f]{40}$ ]]
[[ $prefix =~ ^ghcr.io/[a-z0-9._/-]+$ ]]
mkdir -p "$root"
exec 9>"$root/.deploy.lock"
flock -w 300 9
# Admin-owned settings and secrets stay on the server.
if [[ -f "$root/deploy.conf" ]]; then source "$root/deploy.conf"; fi
export COMPOSE_PROJECT_NAME=${COMPOSE_PROJECT_NAME:-my-blog}
export BACKEND_ENV_FILE=${BACKEND_ENV_FILE:-$root/backend.env}
export POSTGRES_ENV_FILE=${POSTGRES_ENV_FILE:-$root/postgres.env}
: "${PUBLIC_API_BASE_URL:?Set PUBLIC_API_BASE_URL in deploy.conf}"
: "${PUBLIC_IP:?Set PUBLIC_IP in deploy.conf}"
[[ $PUBLIC_API_BASE_URL == "https://$PUBLIC_IP/api/v1" ]]
[[ $PUBLIC_IP =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]]
export PUBLIC_API_BASE_URL PUBLIC_IP
[[ -f $BACKEND_ENV_FILE ]]
[[ -f $POSTGRES_ENV_FILE ]]
for image in \
  traefik:v3.7.4 \
  postgres:16-alpine \
  prom/prometheus:v3.5.0 \
  prom/node-exporter:v1.8.2 \
  gcr.io/cadvisor/cadvisor:v0.49.1 \
  certbot/certbot:v5.4.0; do
  docker image inspect "$image" >/dev/null
done
old_backend=$(docker inspect -f '{{.Config.Image}}' blog-backend 2>/dev/null || true)
old_frontend=$(docker inspect -f '{{.Config.Image}}' blog-frontend 2>/dev/null || true)
export BACKEND_IMAGE="$prefix/backend:$sha"
export FRONTEND_IMAGE="$prefix/frontend:$sha"
docker image inspect "$BACKEND_IMAGE" >/dev/null
docker image inspect "$FRONTEND_IMAGE" >/dev/null
release="$root/releases/$sha"
mkdir -p "$release"
cp docker-compose.production.yml "$release/compose.yml"
cp deploy/prometheus.yml "$release/prometheus.yml"
mkdir -p "$release/traefik-dynamic"
cat > "$release/traefik-dynamic/tls.yml" <<EOF
tls:
  stores:
    default:
      defaultCertificate:
        certFile: /etc/letsencrypt/live/$PUBLIC_IP/fullchain.pem
        keyFile: /etc/letsencrypt/live/$PUBLIC_IP/privkey.pem
EOF
compose=(docker compose -p "$COMPOSE_PROJECT_NAME" -f "$release/compose.yml")
"${compose[@]}" config --quiet
# Bring up the HTTP-01 responder before requesting the IP certificate. Traefik
# still serves port 80 while the referenced TLS files do not exist yet.
"${compose[@]}" up -d --no-build --pull never traefik acme-challenge
certbot_args=(
  certonly --non-interactive --agree-tos --preferred-profile shortlived
  --webroot --webroot-path /var/www/certbot
  --ip-address "$PUBLIC_IP" --cert-name "$PUBLIC_IP" --keep-until-expiring
)
if [[ -n ${LETSENCRYPT_EMAIL:-} ]]; then
  certbot_args+=(--email "$LETSENCRYPT_EMAIL")
else
  certbot_args+=(--register-unsafely-without-email)
fi
"${compose[@]}" run --rm --no-deps --entrypoint certbot certbot-renew "${certbot_args[@]}"
touch "$release/traefik-dynamic/tls.yml"
"${compose[@]}" restart traefik
umask 077
printf 'BACKEND_IMAGE=%q\nFRONTEND_IMAGE=%q\n' "$old_backend" "$old_frontend" > "$root/previous-images.env"
if ! "${compose[@]}" up -d --no-build --wait --wait-timeout 180; then
  echo 'Deployment health check failed.' >&2
  if [[ -n $old_backend && -n $old_frontend ]]; then
    export BACKEND_IMAGE=$old_backend FRONTEND_IMAGE=$old_frontend
    echo 'Restoring previous container images (no database rollback).' >&2
    "${compose[@]}" up -d --no-build --pull never --wait --wait-timeout 180
  fi
  exit 1
fi
printf '%s\n' "$sha" > "$root/current-sha"
echo "Deployed $sha"
# Retain previous images for rollback. Do not prune here.
