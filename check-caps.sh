#!/bin/bash
# Capitalization audit for soul and soul-it (rules: CLAUDE.md "Lowercase style rule").
# Run before every commit/push of either repo, together with check-mirror.sh.
# Exits non-zero if any error is found.
exec python3 -I "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/check-caps.py" "$@"
