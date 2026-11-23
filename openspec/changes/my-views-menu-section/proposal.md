---
kind: code
---

# Proposal: my-views-menu-section

## Summary

Ruben's design rule (19 Oct): every app's left menu ends with a **My views** section, at the bottom above the footer entries (Help, Advanced), listing the user's pinned saved views. It replaces app-specific groups such as dossiq's "My case types". saved views (#1792) placed the pinned views after the last menu entry that opens the view's page; this change moves them to the standard section, shows the section also while nothing is pinned (one line saying how to add a view, so it can be found), and leaves an app without saved views untouched.

## Scope

- `src/utils/savedViewMenu.js`: `withSavedViewMenu` places the group at the bottom, with an empty line under `showEmpty`.
- `src/components/CnAppRoot/CnAppRoot.vue`: adds the section for every app that offers saved views.
- `src/components/CnAppNav/CnAppNav.vue`: renders a `type: "hint"` entry as a muted line.
- Builds on #1792 (`feat/saved-filters-manage-and-defaults`), whose tests for the old placement change with it.
- Manifest: no new key; `type: "hint"` is a menu entry type the library emits itself (documenting it in the schema rides the next bump).
