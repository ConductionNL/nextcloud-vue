---
kind: code
---

# Proposal: screens-store-page-pq-board

## Summary

The store page is a library page: it comes from nextcloud-vue and looks the same in every app. Board PqStore draws it
with chips for all, installed, updates and connectors (each with a count) and the search on the right, three cards a
row with a state pill and one action, a side column (what is installed from this store, an Updates card with "Check
now", what ships with the app), Publish as the primary header button, and a footnote. The board look drew only the
catalogue card, on an auto-fill track, under the Nextcloud controls.

Under the board look the store page now draws board PqStore. pipelinq's own StoreGallery can then switch to
`type: "store"`.

## Scope

- `src/components/CnStorePage/CnStorePage.vue`: board chips and search, `shownCards`, the side column, the
  `kindChips`, `updatesNote` and `footnote` props, the Available pill and the version line.
- `src/css/look-board-store.css`: the board PqStore rules.
- Manifest schema 2.117.0: page `config.kindChips` and `config.updatesNote` (store).
- `l10n/en.json`, `l10n/nl.json`: the page's new copy.
- The Nextcloud look is unchanged: the kind buttons still ask the registry by kind.
