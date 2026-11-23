# Proposal: l10n-merge-driver

## Why

Every branch that adds a library string appends to the end of `l10n/en.json` and `l10n/nl.json`, so two open
branches always edit the same last lines and git reports a conflict on every merge of development. On 17 October the
library lane resolved the same catalogue clash on #1707, #1757 and #1763 (twice), each a full re-run of the gates.

## What changes

- `scripts/merge-l10n.js`: a git merge driver that merges the catalogues key by key (dossiq has run the same idea
  since September).
- `.gitattributes`: `l10n/*.json merge=l10n`.
- `prepare` registers the driver in local git config on `npm install` (git never runs a command a repo ships);
  without it git merges as before.
