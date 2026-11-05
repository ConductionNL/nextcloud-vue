---
kind: code
---

# Proposal: address-search-manual-fallback

## Summary

Board DqZaakLocatie draws, when the PDOK Locatieserver does not answer, a warning "Adres zoeken is nu niet beschikbaar" and the fields Straat en huisnummer and Postcode, so the location can still be saved. CnAddressSearch said the search was unavailable but offered no way to type the address.

## Scope

- `src/components/CnAddressSearch/CnAddressSearch.vue`, strings, docs, `tests/components/CnAddressSearchManual.spec.js`.

## Out of scope

- The server side and the app's manifest; this is the library half.
