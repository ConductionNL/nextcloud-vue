# manifest-map-widget Delta: form-signature-audio-location-fields

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [form-signature-audio-location-fields](../../)

## Purpose

A map page marks the user's own position and can centre on it when it
opens. Answers buildiq `forms-signature-audio-and-location`,
REQ-BQSA-003. The map half of row `pg-device-location` (buildiq matrix).

## ADDED Requirements

### Requirement: A map page can show the user's position

`CnMapPage` SHALL accept `showUserLocation` and `centerOnUser`, both
false by default, from the page's `config`. With `showUserLocation`,
`CnMapWidget` SHALL draw a position marker with an accuracy circle each
time a position is found. With `centerOnUser`, the page SHALL ask for
the position once when the map is ready and centre on it. A refused or
unavailable position SHALL show a note on the map and SHALL leave the
record markers in place. A page with neither option SHALL behave as
before.

#### Scenario: A field worker sees where they are

- GIVEN a map page "Meldingen in de buurt" with `showUserLocation: true` and `centerOnUser: true`
- WHEN a field worker opens it on a phone and allows location
- THEN the map centres on them
- AND a position marker with an accuracy circle shows among the report markers

#### Scenario: A refusal does not break the map

- GIVEN the same page
- WHEN the field worker refuses location
- THEN the report markers still show
- AND a note says their position is not available

#### Scenario: An existing map page is unchanged

- GIVEN a map page without `showUserLocation` or `centerOnUser`
- WHEN a user opens it
- THEN no position is requested
- AND no position marker is drawn
