#!/usr/bin/env bash
#
# One-time bootstrap: claim the 6 platform sub-package names on npm with a
# placeholder version (0.0.1) so that Trusted Publisher can be configured for
# each via npmjs.com UI afterwards.
#
# Usage:
#   export NPM_TOKEN=npm_xxx           # Granular Access Token, R/W on @xarsh scope
#   ./scripts/bootstrap-publish.sh
#
# After this script succeeds:
#   1. Visit each sub-package's /access page and configure Trusted Publisher
#      pointing to repo xarsh/ooxml-validator, workflow release.yaml.
#   2. Optionally: npm deprecate @xarsh/ooxml-validator-<rid>@0.0.1 "placeholder, use 0.2.0+"
#
set -euo pipefail

if [ -z "${NPM_TOKEN:-}" ]; then
  echo "ERROR: NPM_TOKEN env var is not set." >&2
  echo "Create a Granular Access Token at https://www.npmjs.com/settings/<user>/tokens" >&2
  exit 1
fi

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NPMRC="${REPO_ROOT}/.npmrc.bootstrap"

cleanup() {
  rm -f "${NPMRC}"
}
trap cleanup EXIT

cat > "${NPMRC}" <<EOF
//registry.npmjs.org/:_authToken=${NPM_TOKEN}
EOF

BOOTSTRAP_VERSION="0.0.1"

publish_placeholder() {
  local npm_rid="$1"
  local ext=""
  if [[ "$npm_rid" == win32-* ]]; then ext=".exe"; fi
  local pkg_dir="${REPO_ROOT}/npm/${npm_rid}"
  local bin_name="ooxml-validator${ext}"

  echo ""
  echo "--- Publishing @xarsh/ooxml-validator-${npm_rid}@${BOOTSTRAP_VERSION} (placeholder) ---"

  printf 'placeholder for @xarsh/ooxml-validator-%s; use a real release version (0.2.0+).\n' "$npm_rid" \
    > "${pkg_dir}/${bin_name}"

  (
    cd "$pkg_dir"
    npm --userconfig "${NPMRC}" version --no-git-tag-version --allow-same-version "$BOOTSTRAP_VERSION"
    npm --userconfig "${NPMRC}" publish --access public
  )

  rm "${pkg_dir}/${bin_name}"
  (cd "$pkg_dir" && npm version --no-git-tag-version --allow-same-version 0.0.0)
}

publish_placeholder darwin-arm64
publish_placeholder darwin-x64
publish_placeholder linux-arm64
publish_placeholder linux-x64
publish_placeholder win32-arm64
publish_placeholder win32-x64

echo ""
echo "All 6 packages bootstrapped on npm."
echo ""
echo "Next steps:"
echo "  1. For each package, visit:"
echo "     https://www.npmjs.com/package/@xarsh/ooxml-validator-<rid>/access"
echo "     and configure Trusted Publisher (repo: xarsh/ooxml-validator, workflow: release.yaml)."
echo ""
echo "  2. Optionally deprecate the placeholder version:"
echo "     npm deprecate '@xarsh/ooxml-validator-<rid>@0.0.1' 'placeholder, use 0.2.0+'"
echo ""
echo "  3. Then tag v0.2.0 to trigger the real release via CI."
