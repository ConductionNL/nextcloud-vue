---
kind: config
depends_on: []
chain:
  - cn-nav-card-grid-schema
  - cn-nav-card-grid
---

## Why

ADR-044 §4 ("cards-collapse") directs apps to collapse a deep menu group into
one top-level entry linking to a card-grid landing page — one card per former
sub-item. No component in this library renders that shape: `CnCardGrid` is
schema-driven (OpenRegister objects), `CnWidgetCardGrid` renders `CnObjectCard`
per `objects[]` entry, and `CnSiteCardGrid` serves portal sites. None accepts
arbitrary navigation links. Compounding it, `applyMenuRelocations` in
`src/utils/buildManifest.js` dissolves a relocated group that has children —
the group's own label is discarded and its former siblings flatten into one
undifferentiated list. ADR-044 §4 is therefore unimplementable today as a
config-only change in any consuming app.

This is spec 1 of a 2-spec chain (ADR-032): this change declares the JSON
Schema shape only (`kind: config`); `cn-nav-card-grid` (spec 2, `kind: code`,
`depends_on: [cn-nav-card-grid-schema]`) adds the rendering component. Splitting
avoids a `mixed` spec — schema authoring and Vue component authoring have very
different reviewer surfaces per ADR-032.

## What Changes

- Add a `navCardEntry` `$def` to `src/schemas/app-manifest-v2.schema.json`:
  `id`, `label`, `description?`, `icon?`, `route?`/`href?` (mutually
  exclusive, enforced via `oneOf`/`not`), `count?` (integer or `"auto"`),
  `order?`, `permission?`, `visibleIf?` — mirroring the existing
  `menuItem`/`primaryAction` vocabulary.
- Extend the `widgetEntry` `allOf` (the same `if`/`then` pattern already used
  for `widgetKey: "object-table"`) so `widgetKey: "nav-card-grid"` requires
  `props.entries: navCardEntry[]` and forbids other free-form `props` shapes
  drifting in silently.
- Bump `src/schemas/app-manifest-v2.schema.json` `version` from `2.22.0` to
  `2.23.0` (additive, backward-compatible — no existing manifest is
  invalidated).
- Add fixtures + ajv-based schema tests: a valid `nav-card-grid` widget entry,
  a `route`+`href` conflict rejected, a `count: "auto"` entry accepted, an
  entry missing both `route` and `href` accepted (a disabled/informational
  card is valid — the rendering component decides disabled-state, not the
  schema).
- **No BREAKING changes.** `navCardEntry` is a new, unreferenced-by-default
  `$def`; the `widgetEntry` `allOf` addition only constrains manifests that
  already declare `widgetKey: "nav-card-grid"`, which do not exist yet.

## Capabilities

### New Capabilities

- `nav-card-grid-schema`: the `navCardEntry` JSON Schema shape, the
  `nav-card-grid` `widgetEntry.props.entries` constraint, and the manifest
  schema version bump.

### Modified Capabilities

(none — `grid-widget-system` covers the Vue widget components themselves;
schema-only changes land under the new capability above.)

## Impact

- **Code:** `src/schemas/app-manifest-v2.schema.json` only.
- **Consumers:** None require changes — additive `$def`, no existing manifest
  references `widgetKey: "nav-card-grid"` yet.
- **Theming:** None.
- **Cross-repo:** None (chain spec 2, `cn-nav-card-grid`, is the consumer of
  this schema within the same repo).
