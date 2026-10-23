---
kind: code
---

# Proposal: scalar-filter-reaches-request

## Summary

DqOrganisaties opens with the removable chip "Plaats: Zuiddrecht" (`defaultFilters: { "address.place":
"@config.municipalityCity" }`) and listed 13 of 13 organisations, from Leiden, Spanje and Sterksel too. The chip came
from the active filters, but the request went out without `address.place`: `facetFilterParams` only sent a list of
selected values, and a default filter, or `?status=ended` in the address, holds one value on its own.

A filter held as one string, number or boolean is now sent as a selection of one. Lists, the missing-value option and
empty values behave as before.

## Scope

- `src/utils/facets.js`: `facetFilterParams`.
- No schema change.
