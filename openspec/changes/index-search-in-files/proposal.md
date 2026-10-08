---
kind: code
---

# Proposal: index-search-in-files

## Summary

An index page can offer "Also search inside files" next to its search box.
Switched on, the list finds a record by words inside its attached files, and
a row found that way says which file matched. OpenRegister already searches
file content for Nextcloud's top-bar search; index pages never ask for it.

## Why

openregister row `srch-file-content`, "Find a record by words inside its
attached files", rated partial. OpenRegister's change
`tables-bulk-jobs-and-file-search` (openregister PR #4452, design D-1) asks
nextcloud-vue for "a `searchInFiles` option on `CnIndexPage` that shows the
switch, adds `_content_search=true` and renders a 'found in {file}' line on a
row whose hit came from a chunk".

What is there (openregister development, 7 October 2026): `QueryHandler`
widens a search to file-chunk hits when `_content_search` is true, maps them
to the owning object and caps the candidates at 50
(`lib/Service/Object/QueryHandler.php:556`, `ContentSearchHandler.php`). What
OpenRegister's change adds: `@self.matchedFile` (the file name only) on a row
that entered through a chunk.

## What changes

- `CnIndexPage` prop `searchInFiles` (default `false`); manifest
  `config.searchInFiles`.
- With it, a switch beside the search box. On, the list query carries
  `_content_search=true` alongside the search term; off, it does not.
- A row whose `@self.matchedFile` is set shows "Found in {file}" under its
  title.
- The switch state lives in the route query (`contentSearch=1`), so a shared
  link reproduces the list.

## Rows unblocked

- openregister `srch-file-content` (the nextcloud-vue half).
- dossiq and decidiq case and document lists can turn it on by manifest.

## Affected projects

- `nextcloud-vue`: `CnIndexPage`, the v2 manifest schema.
- `openregister`: `@self.matchedFile` (its change). Until it ships, rows
  found through a file show no "Found in" line and the search still works.

## Backward compatibility

Additive. `searchInFiles` defaults to `false`; nothing renders and no key is
sent.

## Theming

`NcCheckboxRadioSwitch`; the "Found in" line in `--color-text-maxcontrast`
as secondary text.
