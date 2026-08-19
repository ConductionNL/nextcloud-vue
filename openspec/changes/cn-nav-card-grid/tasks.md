## 1. Component

- [ ] 1.1 Create `src/components/CnNavCardGrid/CnNavCardGrid.vue`: `props.entries: navCardEntry[]`, renders `CnWidgetWrapper` chrome + a CSS grid of cards (label, description, icon), matching `CnWidgetCardGrid.vue`'s docblock/style conventions.
- [ ] 1.2 Render each card as `<router-link>` (resolvable `route`), `<a>` (`href`), or a disabled non-interactive element (unresolvable `route`) — no custom keyboard/tabindex logic.
- [ ] 1.3 Inject `cnManifest` and `cnMenuCounts`; resolve `count: "auto"` via `route` → page id → `config.register`/`schema` → `cnMenuCounts[register][schema]`; render integer counts as-is; render no badge when unresolved.
- [ ] 1.4 Implement disabled-route detection against `cnManifest.pages`; add `aria-disabled="true"`; emit one deduplicated `console.warn` per unresolved entry id per mount.
- [ ] 1.5 Wire `description` via `aria-describedby`; do not set `aria-label` anywhere on a card.
- [ ] 1.6 Create `src/components/CnNavCardGrid/index.js` barrel; export from `src/components/index.js` and `src/index.js` (mirror `CnWidgetCardGrid`'s export shape).

## 2. Registry and hydration wiring

- [ ] 2.1 Register `'nav-card-grid': CnNavCardGrid` in `src/components/CnWidgetGrid/builtInWidgets.js` `BUILT_IN_WIDGETS`, with a JSDoc note matching the file's existing per-key documentation style.
- [ ] 2.2 Extend `CnAppRoot.vue` `_hydrateMenuCounts()`'s target collection to also walk `manifest.pages[].widgets[]` for `widgetKey === "nav-card-grid"` entries with `count: "auto"` + resolvable `route`, merging into the same de-duplicated batched-counts call.

## 3. Unit tests

- [ ] 3.1 Test: label, description, and icon render per entry.
- [ ] 3.2 Test: `route` renders a `router-link`; `href` renders an `<a>`; the two are mutually exclusive in rendered output.
- [ ] 3.3 Test: `count: "auto"` reads `cnMenuCounts` via injected `cnManifest` page resolution; integer `count` bypasses `cnMenuCounts`.
- [ ] 3.4 Test: an unresolvable `route` renders the card disabled (`aria-disabled="true"`, non-navigating) rather than omitted, and warns exactly once.
- [ ] 3.5 Test: no `aria-label` attribute is present on any rendered card.
- [ ] 3.6 Test (`CnAppRoot`): `_hydrateMenuCounts()` collects targets from a `nav-card-grid` widget's entries and populates `cnMenuCounts`; existing `menu`-only hydration behavior is unchanged when no `nav-card-grid` widget is present.

## 4. Manifest-only render and keyboard tests

- [ ] 4.1 Integration test: a v2 manifest with a `type: "dashboard"` page + one full-grid `widgetKey: "nav-card-grid"` widget, mounted through the normal `CnWidgetGrid`/`CnPageRenderer` resolution path with no consumer `cnRegistry` override, renders the entries correctly.
- [ ] 4.2 Keyboard test: Tab reaches a card; Enter activates it (assert the triggered navigation/route), using Vue Test Utils' `trigger('keydown.enter')` or equivalent — not an assumption.

## 5. Docs

- [ ] 5.1 Write `src/components/CnNavCardGrid/CnNavCardGrid.md` matching `CnWidgetCardGrid.md`'s structure (props table, usage example, a11y notes), then regenerate `docs/components/_generated/CnNavCardGrid.md` via the repo's doc-generation script; pass `npm run check:docs` / `check:jsdoc`.

## 6. Verification

- [ ] 6.1 `npm test` green (new component, registry, and CnAppRoot hydration tests).
- [ ] 6.2 `npm run lint` clean on all touched/new files.
- [ ] 6.3 Confirm `hydra-gate-dashboard-antipattern`'s matcher does not fire on a `type:"dashboard"` page carrying one full-grid `nav-card-grid` widget (it is a built-in `widgetKey`, not a custom registry component — read the gate's matcher before asserting this).
