---
kind: code
---

# Proposal: map-layer-toggles

## Summary

Board DqZaakLocatie draws a "Kaartlagen" fieldset under the map with "Luchtfoto (PDOK)" and "Omgevingsplan (WMS)" switched on. CnMapWidget took fixed layers only.

## Scope

- `src/components/CnMapWidget/CnMapWidget.vue`, docs, `tests/components/CnMapWidgetLayerToggles.spec.js`.

## Out of scope

- The server side and the app's manifest; this is the library half.
