---
kind: code
---

# Proposal: my-filters-menu-section

## Summary

Ruben's design rule (19 Oct): every app's left menu ends with a **My filters** section, at the bottom above the footer entries (Help, Advanced), listing the user's pinned saved filters. It replaces app-specific groups such as dossiq's "My case types". saved-filters-manage-and-defaults (#1792) placed the pinned filters after the last menu entry that opens the filter's page; this change moves them to the standard section, shows the section also while nothing is pinned (one line saying how to add a filter, so it can be found), and leaves an app without saved filters untouched.

## Scope

- `src/utils/savedFilterMenu.js`: `withSavedFilterMenu` places the group at the bottom, with an empty line under `showEmpty`.
- `src/components/CnAppRoot/CnAppRoot.vue`: adds the section for every app that offers saved filters.
- `src/components/CnAppNav/CnAppNav.vue`: renders a `type: "hint"` entry as a muted line.
- Builds on #1792 (`feat/saved-filters-manage-and-defaults`), whose tests for the old placement change with it.
- Manifest: no new key; `type: "hint"` is a menu entry type the library emits itself (documenting it in the schema rides the next bump).
