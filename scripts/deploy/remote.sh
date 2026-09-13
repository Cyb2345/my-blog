#!/usr/bin/env bash
set -euo pipefail
: "${SERVER_HOST:?}" "${SERVER_USER:?}" "${SERVER_SSH_KEY:?}" "${SERVER_KNOWN_HOSTS:?}"
: "${IMAGE_PREFIX:?}" "${GITHUB_SHA:?}" "${DEPLOY_PATH:?}"
: "${GHCR_USER:?}" "${GHCR_TOKEN:?}"
SERVER_PORT=${SERVER_PORT:-22}
# Only permit safe positional SSH arguments (the remote shell parses these).
[[ $SERVER_HOST =~ ^[a-zA-Z0-9][a-zA-Z0-9.-]*$ ]]
[[ $SERVER_USER =~ ^[a-zA-Z_][a-zA-Z0-9_-]*$ ]]
[[ $SERVER_PORT =~ ^[0-9]+$ ]]
[[ $DEPLOY_PATH =~ ^/[a-zA-Z0-9_/-]+$ && $DEPLOY_PATH != / ]]
[[ $GITHUB_SHA =~ ^[0-9a-f]{40}$ ]]
[[ $IMAGE_PREFIX =~ ^ghcr.io/[a-z0-9._/-]+$ ]]
[[ $GHCR_USER =~ ^[a-zA-Z0-9-]+$ ]]
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
printf '%s\n' "$SERVER_SSH_KEY" > "$work/key"
printf '%s\n' "$SERVER_KNOWN_HOSTS" > "$work/known_hosts"
chmod 600 "$work/key" "$work/known_hosts"
options=(-i "$work/key" -o BatchMode=yes -o StrictHostKeyChecking=yes -o "UserKnownHostsFile=$work/known_hosts" -o ConnectTimeout=20 -o ServerAliveInterval=15 -o ServerAliveCountMax=4)
target="$SERVER_USER@$SERVER_HOST"
remote=$(ssh "${options[@]}" -p "$SERVER_PORT" "$target" 'mktemp -d /tmp/my-blog.XXXXXXXXXX')
[[ $remote =~ ^/tmp/my-blog\.[a-zA-Z0-9]+$ ]]
cleanup() {
  ssh "${options[@]}" -p "$SERVER_PORT" "$target" "rm -rf -- '$remote'" || true
  docker logout ghcr.io >/dev/null 2>&1 || true
  rm -rf "$work"
}
trap cleanup EXIT
tar -cf "$work/release.tar" docker-compose.production.yml deploy/prometheus.yml scripts/deploy/deploy.sh
scp "${options[@]}" -P "$SERVER_PORT" "$work/release.tar" "$target:$remote/release.tar"
printf '%s' "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin >/dev/null
backend_image="$IMAGE_PREFIX/backend:$GITHUB_SHA"
frontend_image="$IMAGE_PREFIX/frontend:$GITHUB_SHA"
# Pull on the hosted runner, then stream one archive over the verified SSH
# connection. This avoids slow or blocked registry paths on the target host.
docker pull "$backend_image"
docker pull "$frontend_image"
docker save "$backend_image" "$frontend_image" | gzip -1 | \
  ssh "${options[@]}" -p "$SERVER_PORT" "$target" 'gunzip | docker load'
ssh "${options[@]}" -p "$SERVER_PORT" "$target" \
  "cd '$remote' && tar -xf release.tar && bash scripts/deploy/deploy.sh '$DEPLOY_PATH' '$IMAGE_PREFIX' '$GITHUB_SHA'"
