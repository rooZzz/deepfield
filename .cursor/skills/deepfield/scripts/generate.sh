#!/bin/sh
set -e
ROOT="${1:-$(pwd)}"
if [ "$#" -gt 0 ]; then
  shift
fi
HERE="$(CDPATH= cd -- "$(dirname -- "$0")/../../../.." && pwd)"
cd "$HERE"
exec npx tsx src/cli.ts generate --root "$ROOT" "$@"
