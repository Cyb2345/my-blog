#!/usr/bin/env bash
# Runs on the server. No builds, git checkout, dependency installs, or volume pruning.
set -euo pipefail
root=${1:?Deployment directory required}
prefix=${2:?Image prefix required}
sha=${3:?Full commit SHA required}
: "${GHCR_USER:?Registry username required}"
[[ $root == /* && $root != / ]]
[[ $sha =~ ^[0-9a-f]{40}$ ]]
[[ $prefix =~ ^ghcr.io/[a-z0-9._/-]+$ ]]
mkdir -p "$root"
exec 9>"$root/.deploy.lock"
flock -w 300 9
# The workflow sends its short-lived token on stdin. Keep Docker credentials in
# a temporary directory and remove them at process exit.
IFS= read -r ghcr_token
[[ -n $ghcr_token ]]
docker_config=$(mktemp -d /tmp/my-blog-docker.XXXXXXXXXX)
cleanup_registry() { rm -rf "$docker_config"; }
trap cleanup_registry EXIT
export DOCKER_CONFIG=$docker_config
printf '%s' "$ghcr_token" | docker login ghcr.io -u "$GHCR_USER" --password-stdin >/dev/null
unset ghcr_token
# Admin-owned settings and secrets stay on the server.
if [[ -f "$root/deploy.conf" ]]; then source "$root/deploy.conf"; fi
export COMPOSE_PROJECT_NAME=${COMPOSE_PROJECT_NAME:-my-blog}
export BACKEND_ENV_FILE=${BACKEND_ENV_FILE:-$root/backend.env}
export POSTGRES_ENV_FILE=${POSTGRES_ENV_FILE:-$root/postgres.env}
: "${PUBLIC_API_BASE_URL:?Set PUBLIC_API_BASE_URL in deploy.conf}"
export PUBLIC_API_BASE_URL
[[ -f $BACKEND_ENV_FILE ]]
[[ -f $POSTGRES_ENV_FILE ]]
for image in \
  traefik:v3.7.4 \
  postgres:16-alpine \
  prom/prometheus:v3.5.0 \
  prom/node-exporter:v1.8.2 \
  gcr.io/cadvisor/cadvisor:v0.49.1; do
  docker image inspect "$image" >/dev/null
done
old_backend=$(docker inspect -f '{{.Config.Image}}' blog-backend 2>/dev/null || true)
old_frontend=$(docker inspect -f '{{.Config.Image}}' blog-frontend 2>/dev/null || true)
export BACKEND_IMAGE="$prefix/backend:$sha"
export FRONTEND_IMAGE="$prefix/frontend:$sha"
release="$root/releases/$sha"
mkdir -p "$release"
cp docker-compose.production.yml "$release/compose.yml"
cp deploy/prometheus.yml "$release/prometheus.yml"
compose=(docker compose -p "$COMPOSE_PROJECT_NAME" -f "$release/compose.yml")
"${compose[@]}" config --quiet
pull_attempt=1
until "${compose[@]}" pull backend frontend; do
  if (( pull_attempt >= 3 )); then
    echo "Image pull failed after $pull_attempt attempts." >&2
    exit 1
  fi
  echo "Image pull attempt $pull_attempt failed; retrying." >&2
  sleep $((pull_attempt * 5))
  pull_attempt=$((pull_attempt + 1))
done
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
