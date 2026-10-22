# map-widget Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [map-without-controls](../../)

## ADDED Requirements

### Requirement: A map can draw without controls

A map widget with `content.controls: false` SHALL draw neither Leaflet's zoom control nor its fit, locate and fullscreen
bar. Without the key the controls SHALL draw as before.

#### Scenario: The case Locations card

- **GIVEN** the Locations card sets `controls: false`
- **WHEN** a case with two locations opens
- **THEN** the map shows both markers and no zoom, fit or locate buttons
