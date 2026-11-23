---
kind: code
---

# Proposal: users-source-row-actions

## Summary

DqAfdelingen draws a "…" menu at the end of each staff row. It holds what the page offers per person: their Nextcloud profile (`/u/<uid>`) and an e-mail to them when they have an address. The `users` source now declares those two as row actions; both are links, so they can be opened in a new tab or copied. No write action is added: staff come from Nextcloud and are managed there.

Stacked on users-source-header-filters (and so on users-source-pages); merge after them.

## Scope

- `src/composables/indexSources.js`, `l10n/en.json`, `l10n/nl.json` ("Open profile"), tests. No schema change.
