# Proposal: related-filters-on-array-elements

## Why

dossiq's case list filters a case type's fields through CnRelatedFieldFilters, which asks OpenRegister for `caseProperty`
rows (`_related[caseProperty][case][…]`). A case keeps its answers in its own `properties[]` array, and :8080 holds 14
cases with answers and 0 `caseProperty` rows, so a case-type field filter matches nothing (DQ-REINT, 23 Oct).

## What changes

`related.element` (the searched row's array property) makes CnRelatedFieldFilters compile OpenRegister's `_element`
filter (openregister feat/array-element-filters) instead of `_related`: one block per filled field, numbered when there
are more, a list value sent as a list. The bar keeps and clears `_element` keys as it does `_related` ones, and reads an
`_element` refusal back to the field it is about. Without `element` nothing changes.

## Scope

nextcloud-vue, `utils/relatedFieldFilters.js` and the component's docs. Index page config is open: no schema change.
