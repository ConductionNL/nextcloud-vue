---
kind: code
---

# Proposal: header-action-href

## Summary

nextcloud-vue#1314. A manifest `headerActions[]` entry could only be a button, so an action that just opens another page (stackiq's "Add integration") could not be middle-clicked, opened in a new tab, copied or bookmarked, and its app had to call `window.location.assign` from a handler. A header action with `href` now renders as a real `<a href>` on every surface that renders header actions, runs no handler and emits nothing.

## Scope

- `src/utils/actionLink.js`: `resolveManifestHref` (URL resolution) and `headerActionAsLink` (an entry in its link form).
- `src/components/CnIndexPage/CnIndexPage.vue`, `CnDetailPage`, `CnDashboardPage`, `CnReportsPage`, `CnActionButtons`: hand the link form to their header surfaces.
- `src/schemas/app-manifest-v2.schema.json` 2.134.0: `$defs/headerAction` and `$defs/headerLinkAction`.
