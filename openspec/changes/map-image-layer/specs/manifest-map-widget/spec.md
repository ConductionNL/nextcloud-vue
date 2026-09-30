# manifest-map-widget Delta: map-image-layer

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [map-image-layer](../../)

## Purpose

`CnMapWidget` shows a picture with pins in pixel coordinates. Answers
the larpinq `worlds-maps` dependency (REQ-WMP-002).

## ADDED Requirements

### Requirement: An image layer shows a picture in flat coordinates

`CnMapWidget` SHALL accept a layer `{ type: "image", url, width,
height }`. A map with an image layer SHALL use flat pixel coordinates
with `(0, 0)` at the picture's top left, `x` to the right and `y` down,
SHALL fit the whole picture on open, and SHALL NOT pan far beyond it.
Other layers beside an image layer SHALL be skipped with a warning.

#### Scenario: The valley of Aldmoor

- GIVEN a world map page with an image layer of 2400 by 1600 pixels
- WHEN a player opens it
- THEN the whole picture is shown, undistorted
- AND dragging cannot move the picture out of view

### Requirement: Markers on an image map are placed by pixel

On an image map, markers SHALL read `xField` and `yField` (default `x`
and `y`) from their rows and SHALL be placed at those pixels at every
zoom level. A row without both numbers SHALL NOT be plotted and SHALL be
counted in a note.

#### Scenario: A pin on the city

- GIVEN a pin "Aldmoor city" at x 820, y 610
- WHEN the player zooms in twice
- THEN the pin stays on the city drawn at that spot
- AND clicking it opens the popup with a link to "The city of Aldmoor"

### Requirement: A click on an image map answers in pixels

On an image map the `click` event SHALL carry `{ x, y }` in the
picture's pixels, rounded and clamped to the picture. On a geographic
map it SHALL keep carrying `{ lat, lng }`.

#### Scenario: Add pin here

- GIVEN a game master on the valley map
- WHEN she clicks the north gate on the picture
- THEN the click event carries the gate's pixel position
