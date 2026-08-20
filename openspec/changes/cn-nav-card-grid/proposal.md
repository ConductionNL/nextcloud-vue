---
kind: code
depends_on: [cn-nav-card-grid-schema]
chain:
  - cn-nav-card-grid-schema
  - cn-nav-card-grid
---

## Why

Spec 1 (`cn-nav-card-grid-schema`) declared the `navCardEntry` JSON Schema
shape. ADR-044 §4 remains unimplementable without a component that actually
renders it: `CnCardGrid` (schema-driven OpenRegister objects),
`CnWidgetCardGrid` (renders `CnObjectCard` per `objects[]` entry), and
`CnSiteCardGrid` (portal sites) all render *data*, not arbitrary navigation
links. This spec adds that component and registers it as the built-in
`nav-card-grid` widget key, so apps can collapse a deep menu group (ADR-044
§4 cards-collapse) into a single top-level link plus a card-grid landing
page without shipping a consumer-side Vue file.

## What Changes

- New component `CnNavCardGrid` (`src/components/CnNavCardGrid/`) rendering
  a responsive grid of native `<router-link>`/`<a>` cards from
  `props.entries: navCardEntry[]` (the shape `cn-nav-card-grid-schema`
  declared). No custom keyboard handling — native elements are focusable and
  activatable by default.
- Register `'nav-card-grid': CnNavCardGrid` in
  `src/components/CnWidgetGrid/builtInWidgets.js`, beside the existing
  `'card-grid': CnWidgetCardGrid`. No renderer-dispatch change — the registry
  is the only touch point (verified: `CnWidgetGrid` resolves `widgetKey`
  against `BUILT_IN_WIDGETS` first, then the consumer `cnRegistry` inject).
- `count: "auto"` on a `navCardEntry` reads the injected `cnMenuCounts`
  reactive object (provided by `CnAppRoot`), resolving the entry's `route` to
  a manifest page id → `page.config.register`/`schema` → `cnMenuCounts[register][schema]`.
  The component does no data fetching itself.
- **Extend `CnAppRoot._hydrateMenuCounts()`** (`src/components/CnAppRoot/CnAppRoot.vue`)
  to also collect `(register, schema)` targets from `pages[].widgets[]` entries
  where `widgetKey === "nav-card-grid"` and an entry has `count: "auto"` +
  `route`, alongside its existing `manifest.menu` walk. This is required
  because cards-collapse (ADR-044 §4) removes the former leaf items from
  `menu` entirely (`applyMenuRemovals` deletes them once relocated into a
  card page) — without this extension, `cnMenuCounts` would never contain the
  register/schema pairs the cards need, and `count: "auto"` would silently
  render no badge even though the underlying data exists. Verified: today's
  `collectAutoTargets` walks only `manifest.menu`.
- A card whose `route` does not resolve to a known page renders **disabled**
  (visually flagged, `aria-disabled="true"`, non-navigating) and emits one
  `console.warn` per unresolved route per mount — never silently hidden
  (ADR-044 §5, no-functionality-loss invariant).
- No `aria-label` on a card — its accessible name comes from its content
  (label + icon text alternative); `description` (when present) is wired via
  `aria-describedby`.
- Placement guidance (documented, not a schema change): a `type: "dashboard"`
  page with one full-grid `nav-card-grid` widget and `config.allowEdit: false`.
  This reuses the dashboard page's existing GridStack dependency rather than
  avoiding it — every app in ADR-044's scope already renders a dashboard page,
  so this adds no incremental bundle weight over a new page type, which would
  add permanent renderer-dispatch plus a second layout path.
- Docs: `src/components/CnNavCardGrid/CnNavCardGrid.md` (component doc,
  matching `CnWidgetCardGrid.md`'s pattern) + regenerated
  `docs/components/_generated/CnNavCardGrid.md`.

## Capabilities

### New Capabilities

- `nav-card-grid`: `CnNavCardGrid` rendering behavior — entry rendering
  (label/description/icon), route-vs-href handling, disabled-route fallback,
  `count: "auto"` resolution via `cnMenuCounts`, keyboard operability via
  native elements, and its registration as the built-in `nav-card-grid`
  widget key.

### Modified Capabilities

(none — no existing capability spec documents `CnAppRoot._hydrateMenuCounts()`
or the `BUILT_IN_WIDGETS` registry; the extension to both is described as
part of the new `nav-card-grid` capability above, since it exists solely to
serve this component's contract.)

## Impact

- **Code:** `src/components/CnNavCardGrid/CnNavCardGrid.vue` (new),
  `src/components/CnNavCardGrid/index.js` (new, barrel),
  `src/components/CnWidgetGrid/builtInWidgets.js` (add registry entry),
  `src/components/CnAppRoot/CnAppRoot.vue` (`_hydrateMenuCounts` extension),
  `src/components/index.js` (barrel export), `src/index.js` (top-level
  barrel export, matching `CnWidgetCardGrid`'s export shape).
- **Consumers:** All five (OpenRegister, OpenCatalogi, Procest, Pipelinq,
  LaunchPad) can now adopt ADR-044 §4 cards-collapse for deep menu groups
  purely via manifest data — no per-app Vue file required.
- **Theming:** Existing CSS custom properties only (`--color-*`,
  `--border-radius*`, `--default-grid-baseline`) — no new tokens, light and
  dark both inherit automatically.
- **Cross-repo:** None directly — per-app cards-collapse adoption (writing
  `menu-layout.json` relocations + the `nav-card-grid` manifest page) is
  future per-app work, out of scope here.
