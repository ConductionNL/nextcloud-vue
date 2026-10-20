---
kind: code
---

# Proposal: open-modal-props-tokens

## Summary

An `open-modal` action handed its `props` over as written, so `"objectId": "@objectId"` reached the dialog as the literal token. dossiq's own dialogs worked around it by reading the route; the library's CnActionDialog then built urls like `/case/@objectId/acts`. The dispatcher now resolves a prop that is exactly a token against the page's token context, and CnActionDialog falls back to the route's `id` when its `objectId` is empty or still a token.

## Scope

- `src/utils/actionsDispatcher.js` (open-modal), `src/components/CnActionDialog/CnActionDialog.vue`, docs.
- No schema change.
