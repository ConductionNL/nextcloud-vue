## Context

`CnIndexPage` is the shared index surface for all five Conduction apps. It already owns a
`viewMode` prop (`'table' | 'cards'`), a CnActionsBar segmented toggle (props
`showViewToggle`, `cardsLabel`/`tableLabel`, `cardsIcon`/`tableIcon`, event
`@view-mode-change`), and a `displayObjects` collection that is the filtered/sorted result
set both the table and card branches render. A separate, already-shipped `CnMapWidget`
(`src/components/CnMapWidget/CnMapWidget.vue`) renders a Leaflet map from a declarative
`{ center, zoom, layers, markers }` shape, where `markers` may be an inline GeoJSON
FeatureCollection (`markers.features`) OR a fetched `markers.dataSource.url`, and emits
`@marker-click` with `{ feature, latlng, originalEvent }`.

Current render branches in `CnIndexPage.vue`: `CnDataTable` is `v-else-if="currentViewMode === 'table'"`,
`CnCardGrid` is the final `v-else`. The CnActionsBar toggle is a binary segmented control
with a sliding thumb keyed on `viewMode === 'table'`.

This change adds `'map'` as a third, strictly opt-in view mode that plots the current
filtered rows on `CnMapWidget` and navigates on marker click exactly like a row click.

Constraints (from nextcloud-vue/CLAUDE.md "Rules for Modifying Components"): Vue 2.7
Options API only; every new prop MUST have a default; no prop/event/slot may be removed;
Nextcloud CSS variables only (no `--nldesign-*`); `cn-` CSS prefix; docs + JSDoc required
for every new prop/event.

## Goals / Non-Goals

**Goals:**

- Add `'map'` to the `viewMode` validator and the CnActionsBar toggle, gated behind
  manifest opt-in (`config.map` and/or `config.viewModes`). Default stays `'table'`.
- Render the map branch with the EXISTING `CnMapWidget`, fed inline markers derived from
  `displayObjects` — no new fetch path, reusing all existing filter/search/sidebar logic.
- Resolve marker geometry from OpenRegister `@self` metadata via
  `config.map: { latField, lngField, geoField, popupField }`.
- Make marker click emit the SAME row payload as a table row-click (`@row-click`).
- 100% backward compatible: apps that never opt in are unaffected.

**Non-Goals:**

- Changing `CnMapWidget` itself (reused as-is).
- Server-side geometry extraction — OR's maps-overview leaf already produces geometry on
  `@self`; this change only consumes it.
- Marker clustering strategy, heatmaps, draw/edit tools, or map-driven filtering (drawing
  a bounding box to filter rows) — future work.
- A new per-app map endpoint or a second list fetch.

## Decisions

**D1 — Third view mode as an additive branch, not a rewrite.**
Add a `v-else-if="currentViewMode === 'map'"` branch that renders `<CnMapWidget>` and make
the card branch an explicit `v-else-if="currentViewMode === 'cards'"` (or keep `v-else`)
so table/cards behaviour is untouched. The `viewMode` validator becomes
`['table', 'cards', 'map'].includes(v)`. Alternative considered: a separate `CnMapPage`
component — rejected because it would duplicate the filter/sidebar/quick-filter machinery
and diverge navigation, defeating the shared-abstraction goal.

**D2 — Inline markers from `displayObjects`, never `dataSource.url`.**
Build `markers.features` (or the widget's inline marker shape) with a computed property
from `displayObjects`, mapping each row's geometry via `config.map`. This guarantees the
map plots exactly the rows the table already shows and inherits filtering for free.
Alternative: pass `markers.dataSource` to let CnMapWidget fetch — rejected; it would
introduce a second fetch path that diverges from the filtered result set (violates the
spec) and re-queries the server.

**D3 — Geometry mapping via `config.map`.**
A computed marker builder reads `latField`/`lngField` (finite-number coordinates) or
`geoField` (GeoJSON-shaped property) and `popupField` from `config.map`. Rows with no
resolvable geometry are skipped silently. New CnIndexPage props (`mapConfig` or discrete
`mapLatField`/… — see Open Questions) carry these through from the manifest. Alternative:
infer geometry from schema `x-schema-org` GeoCoordinates markers — deferred as an
enhancement; explicit `config.map` is simpler and unambiguous for v1.

**D4 — Opt-in gating via `config.viewModes` + `config.map`.**
The map segment renders in the toggle only when the page opts in. A computed
`availableViewModes` derives from `config.viewModes` (explicit) falling back to "map
available iff `config.map` present". This keeps the default (`table`+`cards`) toggle
byte-for-byte unchanged for non-opting pages.

**D5 — Marker-click → row-click parity.**
Each built marker carries a stable reference to its source row (e.g. the row's `rowKey`
value stored in the GeoJSON feature `properties`). CnIndexPage's `@marker-click` handler
resolves the feature back to the `displayObjects` row and calls the existing
`onRowClick(row)` so the emitted `@row-click` payload is identical to the table path.
Alternative: emit a distinct `@marker-click` upward — rejected; it would force every
consumer to wire a second navigation handler, breaking the "identical navigation" goal.

**D6 — Three-segment toggle in CnActionsBar.**
Extend the existing segmented control with a third `map` button and new `mapLabel`/`mapIcon`
props (defaults empty → built-in "Map" label + map-marker icon). The sliding-thumb
position, currently a boolean keyed on `viewMode === 'table'`, becomes a
three-position class derived from the active mode. CSS uses existing `cn-actions-bar__…`
classes and Nextcloud CSS variables only. Backward compatible: with only two segments the
thumb math must reduce to the current two-position behaviour.

**D7 — `center` for CnMapWidget.**
CnMapWidget requires a `center` prop. Derive an initial center by fitting to the marker
set (bounds of built markers) or, when empty, fall back to a configurable default center
(`config.map.center`) or a neutral default. This avoids a hard failure when the filtered
set is empty.

## Risks / Trade-offs

- **[Empty result set → CnMapWidget `center` required]** → Compute center from marker
  bounds when non-empty; fall back to `config.map.center` or a neutral default when empty;
  render the standard empty state above/alongside the map rather than crashing.
- **[Three-segment thumb animation regressing the two-segment case]** → Keep the two-
  segment thumb math as the default path; add unit tests asserting the non-opted toggle is
  unchanged (two segments, thumb positions as before).
- **[Leaflet unavailable in test/CSP environments]** → CnMapWidget already exposes a
  `fallback` slot and a "map unavailable" state; map-branch tests assert marker-config
  wiring and `@marker-click` → `@row-click` mapping rather than real Leaflet rendering.
- **[Geometry field drift across apps]** → `config.map` is explicit per page; rows without
  resolvable geometry are skipped without error, so partial data degrades gracefully.
- **[Tree-shaking / bundle size]** → No new dependency; CnMapWidget (and Leaflet behind
  it) is only imported/rendered on the map branch, and only when a consumer opts in.

## Migration Plan

Not applicable in the breaking sense — purely additive. Rollout: (1) ship the new props +
map branch with defaults that leave existing pages unchanged; (2) consumer apps opt in per
page by adding `config.map` (and optionally `config.viewModes`) to their manifest. Rollback
is a no-op for non-opting pages; a consumer can remove its `config.map` to drop back to
table/cards with no other change.

## ADR-031 declarative-vs-imperative

N/A — this is a pure frontend component change (Vue component + tests + docs). It
introduces no OpenRegister schema and no lifecycle / aggregation / notification behaviour,
so ADR-031's declarative-notification rules do not apply.

## Open Questions

- **Prop shape for geometry config**: a single object prop `mapConfig` (mirroring
  `config.map`) versus discrete props (`mapLatField`, `mapLngField`, `mapGeoField`,
  `mapPopupField`). Provisional: a single `mapConfig` object prop (defaults `() => ({})`),
  matching the manifest `config.map` block 1:1 and keeping the prop surface small.
- **Default center when the marker set is empty**: honour `config.map.center` if provided,
  else a neutral world-view default. Provisional: `config.map.center` → else `[0, 0]`
  zoom `1`, with the empty-state message shown.
- **How the source row is threaded onto a marker**: store `rowKey` in feature
  `properties` and look the row up in `displayObjects` on click. Provisional: yes, key on
  `rowKey`; falls back to feature identity if `rowKey` is absent.
