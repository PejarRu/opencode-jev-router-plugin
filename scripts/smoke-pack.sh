#!/usr/bin/env bash
# Pack the package, install the tarball with npm into a scratch project and
# import it from plain Node. Proves: correct exports map, compiled output runs
# without Bun, and no runtime dependency (the optional SDK peer) is required.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

tarball="$(cd "$root" && npm pack --silent --pack-destination "$work" | tail -n 1)"

if tar -tzf "$work/$tarball" | grep -E '(^package/(src|test|scripts|example)/|\.test\.)'; then
    echo "smoke: tarball contains files that must not ship" >&2
    exit 1
fi

# positive check: a `files` typo or missed build must fail loudly here,
# not as a confusing resolution error in the import below
tar -tzf "$work/$tarball" | grep '^package/dist/index.js$' >/dev/null || {
    echo "smoke: dist/index.js missing from the tarball" >&2
    exit 1
}

cd "$work"
npm init -y >/dev/null
npm install --silent --no-audit --no-fund "./$tarball"

if [ -d node_modules/@opencode ]; then
    echo "smoke: @opencode/* was installed; the package must not need it at runtime" >&2
    exit 1
fi

node --input-type=module -e '
const { default: plugin } = await import("opencode-jev-router-plugin")
if (plugin?.id !== "opencode-jev-router-plugin" || typeof plugin.setup !== "function") {
    console.error("smoke: unexpected default export", plugin)
    process.exit(1)
}
const mod = await import("opencode-jev-router-plugin")
const extra = Object.keys(mod).filter((key) => key !== "default")
if (extra.length > 0) {
    console.error("smoke: unexpected named runtime exports", extra)
    process.exit(1)
}
console.log("smoke: ok")
'
