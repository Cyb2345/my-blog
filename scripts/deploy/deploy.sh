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
# Optional, admin-owned settings; secrets stay on the server.
if [[ -f "$root/deploy.conf" ]]; then source "$root/deploy.conf"; fi
project=$(docker inspect -f '{{ index .Config.Labels "com.docker.compose.project" }}' blog-backend 2>/dev/null || true)
export COMPOSE_PROJECT_NAME=${COMPOSE_PROJECT_NAME:-$project}
volume=$(docker inspect -f '{{range .Mounts}}{{if and (eq .Destination "/app/uploads") (eq .Type "volume")}}{{.Name}}{{end}}{{end}}' blog-backend 2>/dev/null || true)
export UPLOADS_VOLUME=${UPLOADS_VOLUME:-$volume}
export BACKEND_ENV_FILE=${BACKEND_ENV_FILE:-/opt/.env}
: "${COMPOSE_PROJECT_NAME:?Set existing Compose project in deploy.conf}"
: "${UPLOADS_VOLUME:?Set existing uploads volume in deploy.conf}"
[[ -f $BACKEND_ENV_FILE ]]
docker volume inspect "$UPLOADS_VOLUME" >/dev/null
docker network inspect traefik_proxy >/dev/null
docker network inspect monitoring_net >/dev/null
old_backend=$(docker inspect -f '{{.Config.Image}}' blog-backend 2>/dev/null || true)
old_frontend=$(docker inspect -f '{{.Config.Image}}' blog-frontend 2>/dev/null || true)
export BACKEND_IMAGE="$prefix/backend:$sha"
export FRONTEND_IMAGE="$prefix/frontend:$sha"
release="$root/releases/$sha"
mkdir -p "$release"
cp docker-compose.production.yml "$release/compose.yml"
compose=(docker compose -p "$COMPOSE_PROJECT_NAME" -f "$release/compose.yml")
"${compose[@]}" config --quiet
# Login to GHCR once as this deploy user during server setup.
"${compose[@]}" pull
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
