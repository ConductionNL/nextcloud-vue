# address-search-manual-fallback Delta: address-search-manual-fallback

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [address-search-manual-fallback](../../)

## ADDED Requirements

### Requirement: An unavailable address search falls back to typed fields

With `manualFallback`, an address search that answers 404 or 503 SHALL show a stacked warning notice (`unavailableTitle`, default "Address search is not available right now"; `unavailableText`, default "Type the address yourself.") and fields for street and house number and postcode (and the place with `manualCity`), labelled by `manualLabels`. `manual` SHALL show the fields from the start. Typing SHALL emit `update:modelValue` with the joined address and `select` with `{ result: null, coordinates: null, address, manual }`. Without `manualFallback` the field SHALL keep its one-line note.
