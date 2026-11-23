---
kind: code
---

# Proposal: search-refusal-notice

## Summary

Boards DqZaken and DqZoekresultaten keep the rows a list had when the server cannot read a search term, and say so in an alert under the search field: "Zoekterm niet begrepen op positie 9:", the server's reason, then "De lijst is niet gefilterd; pas de term aan." CnIndexPage drew the refusal in place of the rows, and CnSearchPage dropped a refused source's results without a word.

## Scope

- `src/utils/searchRefusal.js` (`searchRefusalNotice`), `src/components/CnIndexPage/CnIndexPage.vue` (prop `searchRefusal`), `src/components/CnSearchPage/CnSearchPage.vue`, l10n en + nl (2 strings), `tests/components/SearchRefusalNotice.spec.js`.

## Out of scope

- The app manifests that configure it; this is the library half.
