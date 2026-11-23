---
kind: code
---

# Proposal: index-scope-views

## Summary

A case type's scope look (title, count line, columns, quick filters from its `x-index`) applied in every view mode, so the werkbord (DqWerkbord) narrowed to one case type took the list's case-type look. `folderSidebar.scopeViews` names the view modes the look applies in; other views keep the page's own look. The scope's filter still applies everywhere.

## Scope

- `src/components/CnIndexPage/CnIndexPage.vue`: `scopeShapesView`, gating `activeScopeLayout` and `activeScopePresentation`.
- Manifest: `folderSidebar.scopeViews` (folderSidebar allows extra keys); the batch integration documents it.
