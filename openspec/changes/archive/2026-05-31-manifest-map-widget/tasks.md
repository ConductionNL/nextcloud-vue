# Tasks: manifest-map-widget

## Library (`@conduction/nextcloud-vue`)

- [x] **Add `leaflet` dependency** to `package.json` (`^1.9.0`).
      `leaflet.markercluster` is opt-in (lazy-loaded inside
      `CnMapWidget` only when `clustering: true`).

- [x] **New component**: `src/components/CnMapWidget/CnMapWidget.vue`.
      Wraps Leaflet directly (no vue2-leaflet). Layer dispatch on
      `type ∈ {tile, wms, wfs, geojson}`; geojson lazy-fetches when
      `data` not inlined; markers consume `dataSource.url` (HTTP) OR
      inline `features[]`. Lazy-imports `leaflet.markercluster` on
      first `clustering: true`. Slots: `#legend`, `#popup`,
      `#fallback`. Events: `@map-ready`, `@marker-click`,
      `@bounds-change`, `@click`. Full JSDoc on every prop / event /
      slot / method.

- [x] **New component**: `src/components/CnMapPage/CnMapPage.vue`.
      Composes `CnPageHeader` + `CnMapWidget`. Manifest-shape props
      pass-through. Slots: `#header`, `#filters`, `#legend`,
      `#popup`. Events forward from the widget.

- [x] **Component barrel**: export `CnMapWidget` and `CnMapPage`
      from `src/components/index.js`.

- [x] **Page-type registry**: register `map` in
      `src/components/CnPageRenderer/pageTypes.js`.

- [x] **Schema description**: update `src/schemas/app-manifest.schema.json`
      `pages[].type` description to enumerate `map`.

- [x] **Validator branch**: add `case 'map':` to
      `src/utils/validateManifest.js` `validateTypeConfig`. Enforce
      `center` shape, `zoom` finiteness, `layers[]` closed-enum
      `type`, `markers.dataSource` exactly-one-of constraint.

- [x] **Spec deltas** added to
      `openspec/changes/manifest-map-widget/specs/manifest-map-widget/spec.md`.

- [x] **Unit tests**:
      - `tests/components/CnMapWidget.spec.js` — layer dispatch
        (tile / wms / wfs / geojson), marker rendering from
        `features[]` + `dataSource.url`, clustering opt-in, event
        emission, fallback when Leaflet absent.
      - `tests/components/CnMapPage.spec.js` — manifest-shape
        consumption, slot fallthrough, event pass-through.
      - `tests/components/CnPageRenderer.spec.js` — `map` type
        resolves to `CnMapPage`.
      - `tests/schemas/app-manifest.schema.spec.js` — `map` type
        accepted, valid + invalid `config` shapes covered.
      - `tests/utils/validateManifest.spec.js` — center / zoom /
        layers / markers branches exercised.

- [x] **Documentation**:
      - `docs/components/cn-map-widget.md` — primitive component
        guide + manifest example.
      - `docs/components/cn-map-page.md` — page wrapper guide.
      - `docs/migrating-to-manifest.md` — add the map-page row to
        the per-app migration table (note that procest is the
        first migration).

- [x] **`npm test`** passes (39+ suites, 700+ tests).

- [x] **`npm run check:docs`** passes (or accept additions to the
      baseline if `--update`-style tooling exists).

- [x] **`npm run check:jsdoc`** passes (CnMapWidget + CnMapPage at
      100% public-surface coverage).

## Consumer (`procest`)

- [x] Convert `pages[].id === "CaseMap"` in `src/manifest.json`
      from `type: "custom"` + `component: "CaseMapView"` to
      `type: "map"` with `config.center / zoom / layers / markers`
      reflecting the existing PDOK BRT default + WMS overlay defaults.

- [x] Drop `CaseMapView` from `src/customComponents.js` (it's no
      longer referenced from the manifest). The underlying
      `src/components/map/CaseMap.vue` and the `MapLegend.vue` /
      `MapLayerSwitcher.vue` / `SpatialFilter.vue` files stay in
      the repo as primitives a future custom override could use.

- [x] Manual smoke test: `/index.php/apps/procest/map` renders the
      Netherlands base map with PDOK BRT tiles and case markers, no
      console errors. (Skipped if local Nextcloud is unreachable —
      mirrors pipelinq #331 + form-page-type pattern; documented in
      the report.)
