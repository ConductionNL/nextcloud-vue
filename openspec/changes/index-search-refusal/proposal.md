---
kind: code
---

# Proposal: index-search-refusal

## Summary

ARCH-AUDIT MOVE item. OpenRegister refuses a search term it cannot parse with `400 { error, position, term }`. dossiq draws that refusal on its Cases page with its own CaseSearchRefusal component in the `below-header` slot, reading `objectStore.errors`, because CnIndexPage only showed a generic error. Its note says to delete it the day the library renders the refusal. CnIndexPage now does: the term with the character marked, the server's reason, and what to do next. `parseResponseError` carries the `position` the body sends.

## Scope

- `src/components/CnIndexPage/CnIndexPage.vue`: a refusal state before the generic error state, and a `searchRefusalHint` prop.
- `src/utils/searchRefusal.js` (internal), `src/utils/errors.js` (`position` on a 400 ApiError), `src/css/index-page.css`.
- Schema key needed (no bump here): `searchRefusalHint` on an index page's config, if manifests should set it.
