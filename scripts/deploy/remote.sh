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
  rm -rf "$work"
}
trap cleanup EXIT
tar -cf "$work/release.tar" docker-compose.production.yml scripts/deploy/deploy.sh
scp "${options[@]}" -P "$SERVER_PORT" "$work/release.tar" "$target:$remote/release.tar"
printf '%s\n' "$GHCR_TOKEN" | ssh "${options[@]}" -p "$SERVER_PORT" "$target" \
  "cd '$remote' && tar -xf release.tar && GHCR_USER='$GHCR_USER' bash scripts/deploy/deploy.sh '$DEPLOY_PATH' '$IMAGE_PREFIX' '$GITHUB_SHA'"
