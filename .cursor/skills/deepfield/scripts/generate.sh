#!/bin/sh
set -e
ROOT="${1:-$(pwd)}"
HERE="$(CDPATH= cd -- "$(dirname -- "$0")/../../../.." && pwd)"
cd "$HERE"
exec npx tsx src/cli.ts generate --root "$ROOT"
