# index-sidebar-filter-notes Delta: index-sidebar-filter-notes

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [index-sidebar-filter-notes](../../)

## ADDED Requirements

### Requirement: A filter can carry a note and be a switch

`filtersFromSchema` SHALL carry a property's `facetNote` as the filter's `note`, and `inputControl: "switch"` SHALL make a filter of type `switch` with `switchLabel` (else the title). The index sidebar SHALL draw a `note` as a muted line under the filter, and a `switch` filter as a switch with its words: switching on SHALL emit the values `['true']`, switching off none.
