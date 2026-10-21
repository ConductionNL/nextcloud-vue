# address-search Delta: address-search

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [address-search](../../)

## Purpose

One address field over the PDOK Locatieserver, in every app.

## ADDED Requirements

### Requirement: An address field over the PDOK Locatieserver

CnAddressSearch SHALL search once the reader typed `minLength` characters, through a PDOK proxy and never api.pdok.nl directly: `endpoint` when given, else `/apps/<id>/api/pdok` for the first installed id in `appCandidates`. It SHALL list the `suggest` documents, each with its display text and a second line of its kind and municipality, and SHALL run `free` with `rows` when nothing is suggested. Picking SHALL look up the document by id and emit its display text as `update:modelValue` and `{ result, coordinates, address }` as `select`; clearing SHALL emit null on both. A 404 or 503 from the proxy SHALL show that address search is unavailable, and the field SHALL stay usable.

#### Scenario: Choosing a case address

- **GIVEN** the field on an instance with openconnector installed
- **WHEN** the reader types "Beukenlaan" and picks "Beukenlaan 3, 3311AB Zuiddrecht"
- **THEN** it searched `/apps/openconnector/api/pdok/suggest`, looked the address up, and emitted the text with `{ lat: 51.81, lng: 4.81 }`

#### Scenario: No PDOK proxy

- **GIVEN** an instance without the proxy app
- **WHEN** the reader types an address
- **THEN** the field says address search is not available right now, and a form around it can still be saved
