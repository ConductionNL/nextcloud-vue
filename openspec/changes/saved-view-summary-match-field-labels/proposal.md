---
kind: code
---

# Proposal: saved-view-summary-match-field-labels

## Summary

DqPersoonlijkeInstellingen "Weergaven in mijn menu" describes the Woo-verzoeken view as "Zaaktype Woo-verzoek, status open". Live read "Zaaktype-identificatie woo-verzoek": the view filters on `caseTypeIdentifier`, a case type's identifier, which is no reference property, so the summary showed the field's own title and the raw value. A page's `filterLabels` entry may now name the record such a value identifies: `reference: { register?, schema, matchField, labelField }`. `viewFilterReferences` lists it (with `matchField`), and CnSavedViewMenuSettings reads each value's record by that field (one read per value, cached) and names it by `labelField`. The entry's `label` already titles the filter.

## Scope

- `src/utils/savedViewSummary.js`, `src/components/CnSavedViewMenuSettings/CnSavedViewMenuSettings.vue`, tests. Manifest schema: `filterLabels` entries are free-form objects; no schema change.
