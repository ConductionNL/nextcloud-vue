# board-map-pane-height Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-map-pane-height](../../)

## ADDED Requirements

### Requirement: The board map pane is 533px tall

In the board look an index page's map SHALL be 533px tall, also when the page gives the widget an inline height, so the map pane inside it shows; its base-map switch SHALL be the toggle drawn as a 36px edged button with an 18px layers icon.

#### Scenario: DqZakenKaart

- GIVEN the case map with its list
- THEN the Leaflet pane is 533px tall and shows the tiles
- AND the "Kaartlagen" button is 36px, white, with the control edge
