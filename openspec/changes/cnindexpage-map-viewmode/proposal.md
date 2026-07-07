---
kind: code
---

## Why

Several Conduction apps hold geographic objects (addresses, facilities, cases with a
location) that OpenRegister already extracts geometry for on `@self` metadata, yet
`CnIndexPage` — the shared index surface every app uses — can only render those objects
as a table or a card grid. Consumers who want a map today have to bolt on a bespoke
per-app page and a second fetch path, duplicating the filter/search/sidebar machinery
`CnIndexPage` already owns. Adding `map` as a first-class, opt-in view mode lets every
consumer (OpenRegister, OpenCatalogi, Procest, Pipelinq, MyDash) plot the exact rows the
table already shows, with zero new server work and identical detail-page navigation.

## What Changes

- Add `'map'` as a THIRD value to the `CnIndexPage` `viewMode` prop (validator now
  accepts `'table' | 'cards' | 'map'`). Default stays `'table'`.
- Extend the CnActionsBar view toggle from a two-segment to an (optional) three-segment
  control with new `mapLabel` / `mapIcon` props on both CnIndexPage and CnActionsBar.
- Render the map branch with the EXISTING `<CnMapWidget>`, fed inline markers built from
  the CURRENT FILTERED result set (`displayObjects`) — no new fetch path, so filters,
  quick-filters, search, and the sidebar all keep working unchanged.
- Read marker geometry from OpenRegister object metadata via an opt-in manifest config
  block `config.map: { latField, lngField, geoField, popupField }`, and gate mode
  availability via `config.viewModes`. Map is offered only when opted in.
- A marker click emits the SAME row payload as a table row click (`@row-click`), so
  navigation to the detail page is identical across table, cards, and map.
- Extend vitest specs (`tests/components/`) and the reference doc
  `docs/components/cn-index-page.md`; JSDoc every new prop/event.
- **Backward compatible**: every new prop has a default, no prop/event/slot is removed,
  and apps that never opt in behave exactly as before.

## Capabilities

### New Capabilities

- `index-page-map-view`: the opt-in `map` view mode for CnIndexPage — geometry-config
  opt-in (`config.map`, `config.viewModes`), plotting the current filtered result set as
  markers via CnMapWidget, and marker-click → `row-click` detail navigation parity.

### Modified Capabilities

- `index-page`: the "Table and Card View Toggle" requirement changes — the `viewMode`
  prop and the CnActionsBar toggle now recognise a third `'map'` segment (new `mapLabel`
  / `mapIcon` props), while selection preservation and the default-table behaviour are
  unchanged.

## Impact

- **Affected code (nextcloud-vue only)**: `src/components/CnIndexPage/CnIndexPage.vue`
  (viewMode validator, map render branch, marker/geometry mapping, marker-click handler,
  new props), `src/components/CnActionsBar/CnActionsBar.vue` (third toggle segment + new
  props). Reuses the existing `src/components/CnMapWidget/CnMapWidget.vue` unchanged.
- **Consumers**: all 5 apps benefit; none is forced to change (opt-in). Apps opt in per
  page through their manifest `config` — no API or schema change.
- **Dependencies**: no new dependency; Leaflet already ships behind CnMapWidget.
- **Theming**: uses Nextcloud CSS variables only (no `--nldesign-*`); the third toggle
  segment inherits the existing segmented-control styling.
- **Backward compatibility**: no breaking changes.
