#!/bin/bash
# Regenerates docs/features.json whenever staged changes touch openspec/specs/
# or the features overlay (see CONVENTIONS.md in ConductionNL/.github,
# § "features.json is generated at commit time, never by CI").
#
# Best-effort by design: any failure only warns and never blocks the commit —
# the CI gate (features-check/features-extract → Quality Report) enforces.

if git diff --cached --name-only | grep -qE "^openspec/(specs/|features\.overlay\.json)"; then
  CACHE=".git/extract-features.py"
  # Fetch the canonical script (single source of truth in ConductionNL/.github);
  # fall back to a previously cached copy when offline.
  curl -sf --max-time 10 \
    https://raw.githubusercontent.com/ConductionNL/.github/main/scripts/extract-features.py \
    -o "$CACHE" 2>/dev/null || true

  if [ -f "$CACHE" ]; then
    if command -v python3 >/dev/null 2>&1; then PY="python3";
    elif command -v py >/dev/null 2>&1; then PY="py -3";
    else PY="python"; fi

    if $PY "$CACHE" --app-root . >/dev/null 2>&1; then
      git add docs/features.json
      echo "pre-commit: docs/features.json regenerated from openspec/specs/."
    else
      echo "pre-commit: WARNING — could not regenerate docs/features.json (python or pyyaml missing?). CI features-check will verify." >&2
    fi
  else
    echo "pre-commit: WARNING — could not fetch extract-features.py (offline?). CI features-check will verify." >&2
  fi
fi

exit 0
