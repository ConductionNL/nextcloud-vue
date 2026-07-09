## 1. View mode + toggle plumbing

- [x] 1.1 Extend `viewMode` validator in `CnIndexPage.vue` to `['table', 'cards', 'map'].includes(v)`, keeping default `'table'`.
- [x] 1.2 Add `mapLabel` and `mapIcon` props (String, default `''`) to `CnIndexPage.vue`, JSDoc'd, and pass them into CnActionsBar.
- [x] 1.3 Add `mapLabel`/`mapIcon` props (default `''`) to `CnActionsBar.vue` and render a third `map` toggle segment with a built-in fallback label ("Map") + map-marker icon.
- [x] 1.4 Update the CnActionsBar sliding-thumb positioning to a three-position class derived from the active mode, preserving the exact two-segment behaviour when only table/cards are shown.
- [x] 1.5 Add a `mapConfig` object prop (default `() => ({})`) to `CnIndexPage.vue` carrying `config.map` (`latField`, `lngField`, `geoField`, `popupField`, optional `center`).
- [x] 1.6 Add an `availableViewModes` computed deriving the offered segments from `config.viewModes` (falling back to "map available iff `mapConfig` is non-empty") and gate the toggle's map segment on it.

## 2. Map render branch

- [x] 2.1 Import `CnMapWidget` into `CnIndexPage.vue` and register it in `components`.
- [x] 2.2 Add a `v-else-if="currentViewMode === 'map'"` render branch and make the card branch an explicit `cards` condition so table/cards stay unchanged.
- [x] 2.3 Add a `mapMarkers` computed that builds inline markers from `displayObjects` using `mapConfig`, storing each row's `rowKey` in the feature `properties`; skip rows without resolvable finite geometry.
- [x] 2.4 Add a `mapCenter` computed that fits to the marker bounds, falling back to `mapConfig.center` then a neutral default when the set is empty.
- [x] 2.5 Wire the map branch's empty/loading states to reuse the existing CnIndexPage empty-state handling.

## 3. Navigation parity

- [x] 3.1 Add an `onMarkerClick` handler that resolves the CnMapWidget `@marker-click` feature back to its `displayObjects` row (via `rowKey`) and routes it through the existing `onRowClick` so `@row-click` fires with the identical row payload.

## 4. Tests (@vue/test-utils + vitest)

- [x] 4.1 Extend `tests/components/CnIndexPage.spec.js`: `viewMode='map'` renders CnMapWidget and NOT CnDataTable/CnCardGrid; non-opted pages show no map segment and behave as before.
- [x] 4.2 Add a test asserting `mapMarkers` plots one marker per resolvable `displayObjects` row, updates when a filter narrows the set, and never passes a `dataSource.url`.
- [x] 4.3 Add a test asserting rows without finite geometry are skipped without throwing.
- [x] 4.4 Add a test asserting a marker click emits `@row-click` with a payload identical to a table row-click for the same row.
- [x] 4.5 Add a CnActionsBar test asserting the three-segment toggle emits `@view-mode-change('map')` and that the two-segment case is unchanged.

## 5. Docs

- [x] 5.1 Update `docs/components/cn-index-page.md` documenting `mapLabel`, `mapIcon`, `mapConfig`, the `map` view mode, `config.map`/`config.viewModes` opt-in, and marker-click navigation parity.
- [x] 5.2 Run `npm test` and `npm run build`; fix any lint/build failures introduced by the change.

## Acceptance Criteria

- `viewMode` accepts `'table' | 'cards' | 'map'` with default `'table'`; every new prop has a default and no existing prop/event/slot is removed.
- The `map` segment appears only when a page opts in via `config.map` and/or `config.viewModes`; non-opting pages render and behave byte-for-byte as before.
- The map branch renders `CnMapWidget` with inline markers built from the current filtered `displayObjects` — no new fetch path.
- Marker geometry resolves from OR `@self` metadata via `config.map`; rows without geometry are skipped silently.
- A marker click emits the same `@row-click` payload as a table row-click, giving identical detail-page navigation.
- `npm test` and `npm run build` pass.

## Quality Checklist

- Vue 2.7 Options API only (no Composition API).
- CSS classes use the `cn-` prefix; colours use Nextcloud CSS variables only (no `--nldesign-*`).
- Every new prop/event is JSDoc'd and documented in the reference doc.
- Unit tests cover the map branch, opt-in gating, geometry skipping, and marker-click parity.
- No breaking changes to the existing table/cards behaviour.
