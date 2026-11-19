#!/usr/bin/env bash
# Builds every page of the site at once.
set -euo pipefail
cd "$(dirname "$0")"
node build/build.mjs
