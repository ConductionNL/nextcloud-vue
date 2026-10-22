# Proposal: map-without-controls

## Why

The case board's Locations card (DqZaak) draws a small map with its markers and no controls. The map widget always drew
Leaflet's zoom control and the fit, locate and fullscreen bar, which the comparison counts as extra controls.

## What changes

`content.controls: false` draws neither the zoom control nor the control bar. Default unchanged.
