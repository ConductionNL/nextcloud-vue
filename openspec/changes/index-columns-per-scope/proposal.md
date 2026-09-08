---
kind: code
---

# Proposal: index-columns-per-scope

## Summary

Let a `CnIndexPage` carry a column set, default sort and search fields per
scope of its `folderSidebar`. When the user picks a case type in the sidebar,
the list shows the columns that type needs. Today columns are declared once per
index page.

Opened from the dossiq competitor analysis, round 2, Tier B row B10
(`concurrentie-analyse/procest/_round2/compare/tier-b-and-sibling.md`).
Decision D10 (Ruben, 2026-09-08): proposal now, implementation separate.

## Motivation

A permit case and a complaint want different columns. dossiq's Cases and
Tasks pages declare one column list each, in the manifest, for every type
(M1 11.9; `_round2/dossiq-baseline/pages/Cases.md`). Two competitors bind
columns to the case type:

- Valtimo GZAC configures the case list columns and the task list columns per
  case definition (`valtimo/round2/pages/CaseDefinition-Dossierlijst.md`,
  `valtimo/round2/pages/CaseDefinition-Taken.md`).
- xxllnc Zaaksysteem sets columns per saved search over any custom attribute
  (`xxllnc-zaken/round2/pages/UitgebreidZoeken-nieuw.md`).

The per-user half of this is `saved-views-shared-by-role`. This change is the
admin-declared half: a column set that follows the sidebar scope.

## Affected projects

- `nextcloud-vue`: `CnIndexPage`, the manifest v2 schema for `folderSidebar`,
  the `index-page` capability.
- Consumers: dossiq (Cases, Tasks), pipelinq, opencatalogi, every index page
  with a `folderSidebar`.

## Backward compatibility

A `folderSidebar` scope without `columns` inherits the page's columns. Pages
without a sidebar are untouched. The manifest v2 validator accepts the new
optional keys and rejects nothing it accepted before.

## Theming

None. The column header row is the existing `CnDataTable` header.
