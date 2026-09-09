#!/usr/bin/env bash
# Mock Docker: exercise deployment decisions without touching any containers.
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
cat > "$work/bin/docker" <<'MOCK'
#!/usr/bin/env bash
set -eu
echo "$* | ${BACKEND_IMAGE:-} | ${FRONTEND_IMAGE:-} | ${UPLOADS_VOLUME:-}" >> "$TEST_LOG"
if [[ $1 == inspect ]]; then
  case "$3" in
    *Labels*) echo oldproject ;;
    *Mounts*) [[ ${TEST_MODE:-} == missing ]] || echo oldproject_uploads ;;
    *Config.Image*) echo "old-$4:previous" ;;
  esac
elif [[ $1 == compose ]]; then
  case " $* " in
    *" pull "*) [[ ${TEST_MODE:-} != pull-failure ]] ;;
    *" up "*)
      if [[ ${TEST_MODE:-} == health-failure && $* != *"--pull never"* ]]; then exit 1; fi ;;
  esac
elif [[ $1 == login ]]; then
  cat >/dev/null
fi
MOCK
chmod +x "$work/bin/"*
export PATH="$work/bin:$PATH"
export BACKEND_ENV_FILE="$work/backend.env"
export GHCR_USER=test-user
touch "$BACKEND_ENV_FILE"
unset COMPOSE_PROJECT_NAME UPLOADS_VOLUME BACKEND_IMAGE FRONTEND_IMAGE
sha=0123456789abcdef0123456789abcdef01234567
for mode in success pull-failure health-failure missing invalid-sha; do
  export TEST_MODE=$mode TEST_LOG="$work/$mode.log"
  : > "$TEST_LOG"
  root="$work/$mode"
  commit=$sha
  [[ $mode != invalid-sha ]] || commit=1234567
  result=0
  printf '%s\n' test-token | bash "$repo/scripts/deploy/deploy.sh" "$root" ghcr.io/example/blog "$commit" > "$work/$mode.out" 2>&1 || result=$?
  if [[ $mode == success ]]; then
    [[ $result == 0 && $(cat "$root/current-sha") == "$sha" ]]
    grep -q 'up -d --no-build --wait' "$TEST_LOG"
    grep -q 'oldproject_uploads' "$TEST_LOG"
    grep -q 'compose -p oldproject ' "$TEST_LOG"
    grep -q 'old-blog-backend:previous' "$root/previous-images.env"
  else
    [[ $result != 0 && ! -f "$root/current-sha" ]]
    if [[ $mode == health-failure ]]; then
      grep -q 'up -d --no-build --pull never.*old-blog-backend:previous.*old-blog-frontend:previous' "$TEST_LOG"
      [[ $(grep -c ' up ' "$TEST_LOG") == 2 ]]
    else
      ! grep -q ' up ' "$TEST_LOG"
      if [[ $mode == missing || $mode == invalid-sha ]]; then ! grep -q ' pull ' "$TEST_LOG"; fi
    fi
  fi
  echo "PASS: $mode"
done
