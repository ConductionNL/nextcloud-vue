#!/usr/bin/env bash
# Pre-commit hook: G3.5 of the auto-update guarantee.
#
# When a `src/components/Cn*/Cn*.vue` file is in the staged set,
# regenerate `docs/components/_generated/<name>.md` via vue-docgen-cli
# and stage the result so the commit lands the SFC + the auto-doc
# partial atomically.
#
# Without this hook, the freshness gate in `code-quality.yml` (G1)
# still catches stale partials at CI time, but the author has to
# remember to run `cd docusaurus && npm run prebuild:docs` manually
# before pushing. This hook closes that loop locally.
#
# Spec: openspec/specs/component-reference/spec.md
#       Requirement: Auto-regeneration on commit (developer ergonomics)

set -euo pipefail

# Bail unless at least one Cn* SFC is staged. The check runs O(staged
# files), so the cost is trivial when nothing in src/components/ moves.
if ! git diff --cached --name-only --diff-filter=ACMR \
     | grep -qE '^src/components/Cn[^/]+/Cn[^/]+\.vue$'; then
  exit 0
fi

# Skip silently if docusaurus deps aren't installed yet. New
# contributors haven't necessarily run `cd docusaurus && npm install`
# before their first commit; failing the commit on this would be a
# bad first-impression. CI's freshness gate still catches the stale
# partial when they push, with a clear "run this command" hint.
if [ ! -x docusaurus/node_modules/.bin/vue-docgen ]; then
  cat <<'EOF' >&2
[pre-commit] Skipping auto-regen: docusaurus/ deps not installed.
[pre-commit] Install once with `cd docusaurus && npm install --legacy-peer-deps`
[pre-commit] to enable automatic partial regeneration on commit. Without it,
[pre-commit] CI's freshness gate will still catch stale _generated/ files,
[pre-commit] just at push time instead of commit time.
EOF
  exit 0
fi

echo '[pre-commit] Cn* SFC staged — regenerating docs/components/_generated/'

# Regenerate. The script is idempotent — if the partials already match
# the source, the diff is empty and `git add` is a no-op.
( cd docusaurus && npm run --silent prebuild:docs )

# Stage every regenerated partial. Even if the author only touched one
# component, vue-docgen-cli rewrites column padding across the whole
# table when widths shift (rare but possible) and any drift would fail
# the freshness gate at push time. Re-staging the whole _generated/
# tree keeps things in lockstep.
git add docs/components/_generated/
