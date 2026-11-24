---
kind: code
---

# Proposal: related-record-read-once

## Summary

A detail page draws several data cards over one record, and every card read the records its relation fields point at by itself. Measured on the dossiq case page: the case type was read five times by the data cards on open (seven with the visibility check and the store). The cards now share one read per related record while a page opens.

## Scope

- `src/utils/readRelatedOnce.js` (new), `src/components/CnObjectDataWidget/CnObjectDataWidget.vue` (`resolveRelations`), `tests/utils/readRelatedOnce.spec.js`, `tests/components/CnObjectDataWidgetRelationReadOnce.spec.js`.

## Out of scope

- The visibility-row read and the object store's own read of the same record; they use other clients and caches.
