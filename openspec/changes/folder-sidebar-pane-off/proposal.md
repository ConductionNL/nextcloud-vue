---
kind: code
---

# Proposal: folder-sidebar-pane-off

## Summary

Boards DqWooVerzoeken and DqKlachten are the Cases list narrowed to one case type (`/cases?caseType=<uuid>`), drawn in that case type's own look from its `x-index` block. That look only applies while a `folderSidebar` is configured, and dossiq's simple profile draws no folder pane, so it set `folderSidebar: null` and lost the look. `folderSidebar.pane: false` keeps the scope from the deep link and draws no pane.

## Scope

- `src/components/CnIndexPage/CnIndexPage.vue`: the pane and the body's `--with-folders` class follow `showsFolderPane`. Loading the folders and reading the deep link are unchanged.
- Manifest: `folderSidebar` already allows extra keys (`additionalProperties: true`), so `pane` validates. Documenting it in the schema rides the next batch bump.
