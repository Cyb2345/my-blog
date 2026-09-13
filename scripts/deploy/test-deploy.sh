#!/usr/bin/env bash
# Mock Docker: exercise deployment decisions without touching containers.
set -euo pipefail
cd "$(dirname "$0")/../.."
repo=$PWD
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
mkdir -p "$work/bin"
cat > "$work/bin/flock" <<'MOCK'
#!/usr/bin/env bash
exit 0
MOCK
cat > "$work/bin/sleep" <<'MOCK'
#!/usr/bin/env bash
exit 0
MOCK
cat > "$work/bin/timeout" <<'MOCK'
#!/usr/bin/env bash
shift
exec "$@"
MOCK
cat > "$work/bin/docker" <<'MOCK'
#!/usr/bin/env bash
set -eu
echo "$* | ${BACKEND_IMAGE:-} | ${FRONTEND_IMAGE:-} | ${PUBLIC_API_BASE_URL:-}" >> "$TEST_LOG"
if [[ $1 == inspect ]]; then
  case "$3" in
    *Config.Image*) echo "old-$4:previous" ;;
  esac
elif [[ $1 == compose ]]; then
  case " $* " in
    *" up "*)
      if [[ ${TEST_MODE:-} == health-failure && $* == *"--wait"* && $* != *"--pull never"* ]]; then exit 1; fi ;;
  esac
elif [[ $1 == image && $2 == inspect ]]; then
  if [[ ${TEST_MODE:-} == missing-image && $3 == *"/frontend:"* ]]; then exit 1; fi
elif [[ $1 == login ]]; then
  cat >/dev/null
fi
MOCK
chmod +x "$work/bin/"*
export PATH="$work/bin:$PATH"
sha=0123456789abcdef0123456789abcdef01234567
for mode in success health-failure missing-env invalid-sha missing-image; do
  export TEST_MODE=$mode TEST_LOG="$work/$mode.log"
  : > "$TEST_LOG"
  root="$work/$mode"
  mkdir -p "$root"
  cat > "$root/deploy.conf" <<CONF
COMPOSE_PROJECT_NAME=my-blog
PUBLIC_IP=192.0.2.10
PUBLIC_API_BASE_URL=https://192.0.2.10/api/v1
BACKEND_ENV_FILE=$root/backend.env
POSTGRES_ENV_FILE=$root/postgres.env
CONF
  touch "$root/backend.env" "$root/postgres.env"
  [[ $mode != missing-env ]] || rm "$root/postgres.env"
  commit=$sha
  [[ $mode != invalid-sha ]] || commit=1234567
  result=0
  bash "$repo/scripts/deploy/deploy.sh" "$root" ghcr.io/example/blog "$commit" > "$work/$mode.out" 2>&1 || result=$?
  if [[ $mode == success ]]; then
    [[ $result == 0 && $(cat "$root/current-sha") == "$sha" ]]
    [[ -f "$root/releases/$sha/prometheus.yml" ]]
    grep -q '/etc/letsencrypt/live/192.0.2.10/fullchain.pem' "$root/releases/$sha/traefik-dynamic/tls.yml"
    grep -q 'compose -p my-blog .* run --rm --no-deps --entrypoint certbot certbot-renew' "$TEST_LOG"
    grep -q 'compose -p my-blog .* up -d --no-build --wait' "$TEST_LOG"
    grep -q 'old-blog-backend:previous' "$root/previous-images.env"
    grep -q 'https://192.0.2.10/api/v1' "$TEST_LOG"
  else
    [[ $result != 0 && ! -f "$root/current-sha" ]]
    if [[ $mode == health-failure ]]; then
      grep -q 'up -d --no-build --pull never.*old-blog-backend:previous.*old-blog-frontend:previous' "$TEST_LOG"
      [[ $(grep -c ' up ' "$TEST_LOG") == 3 ]]
    else
      ! grep -q ' up ' "$TEST_LOG"
    fi
  fi
  echo "PASS: $mode"
done

# The IP-only HTTPS workflow must keep using the public CA's short-lived
# profile; a self-signed fallback is not browser-trusted.
grep -q -- '--preferred-profile shortlived' scripts/deploy/renew-ip-certificate.sh
grep -q -- '--ip-address "$PUBLIC_IP"' scripts/deploy/renew-ip-certificate.sh
echo "PASS: IP certificate renewal configuration"
