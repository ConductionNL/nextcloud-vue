# board-map-controls Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-map-controls](../../)

## Purpose

A map's buttons read as the map boards draw them.

## ADDED Requirements

### Requirement: The board map draws its buttons as one column in the top right

In the board look CnMapWidget SHALL draw zoom in, zoom out, fit, locate and full screen as one control bar in the top
right corner, in that order, each button named in the reader's language, and SHALL NOT add Leaflet's own zoom control.
The fit button SHALL use the crosshairs icon. A base map switcher SHALL sit in the top left. With `zoomControl: false`
the zoom buttons SHALL be left out. The Nextcloud look SHALL be unchanged.

#### Scenario: DqZakenKaart

- GIVEN the cases index in the board look, map view
- THEN the map's top right corner holds Inzoomen, Uitzoomen, Alle pins in beeld, Naar mijn locatie and Volledig scherm
- AND Leaflet's zoom control is not on the map

#### Scenario: Nextcloud look

- GIVEN a map outside the board look
- THEN Leaflet's zoom control is on the map and the fit, locate and full screen bar sits in the top left

### Requirement: The board map's buttons are 36px edged squares

In the board look the map's control bar SHALL be a column with 6px between its buttons, 12px from the top and right
edges, without Leaflet's bar edge or shadow. Each button SHALL be 36px square with a 1px control edge, the control
radius, the main background and the main text colour.

#### Scenario: DqZakenKaart zoom in

- GIVEN the cases index in the board look, map view
- THEN "Inzoomen" is 36px high with an 8px radius, a 1px edge and an icon
