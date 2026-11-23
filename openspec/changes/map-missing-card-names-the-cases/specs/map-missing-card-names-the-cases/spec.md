# map-missing-card-names-the-cases Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [map-missing-card-names-the-cases](../../)

## ADDED Requirements

### Requirement: The missing-address card names the cases it counts

The map view's card for rows without a place SHALL name them by the map list's title template, at most three, the rest
counted ("and 2 others"), followed by "have no location, so they are not on the map" (singular for one). Without a title
template the card SHALL keep only its count and link.

#### Scenario: DqZakenKaart

- GIVEN three open cases on the page without a place
- THEN the card reads "Bezwaar parkeerboete Havenstraat, Aanbesteding jeugdzorg 2026 en Rapport luchtkwaliteit 2025 hebben geen locatie, dus staan ze niet op de kaart."
