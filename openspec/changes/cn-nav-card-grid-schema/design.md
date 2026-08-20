## Context

See proposal.md - Why. The manifest schema (`src/schemas/app-manifest-v2.schema.json`)
already defines `menuItem` (top-level nav entries) and `primaryAction`
(a single call-to-action button) as sibling `$def`s under `#/$defs`. It also
defines `widgetEntry` with an `allOf` array of `if`/`then` branches that
tighten `props` shape per `widgetKey` — `widgetKey: "object-table"` is the
existing precedent (see `#/$defs/widgetEntry/allOf`).

## Goals / Non-Goals

**Goals:**
- Define `navCardEntry` as a new `$def`, structurally close to `menuItem` so
  the two vocabularies stay easy to reason about together.
- Constrain `nav-card-grid` widget entries the same way `object-table` is
  already constrained, so the pattern for widget-specific prop shapes stays
  uniform across the schema.
- Keep the change additive and byte-for-byte non-breaking for every existing
  manifest.

**Non-Goals:**
- The `nav-card-grid` Vue component and its runtime behavior (count:"auto"
  resolution, disabled-route rendering, focus handling) — that is
  `cn-nav-card-grid`, spec 2 of this chain.
- Registering `nav-card-grid` as a built-in `widgetKey` in
  `src/components/CnWidgetGrid/builtInWidgets.js` — also spec 2 (that file is
  JS registry code, not schema).
- Changing `menuItem` or `primaryAction` themselves.

## Decisions

### D1 — navCardEntry mirrors menuItem, not primaryAction

**Choice:** Model `navCardEntry` on `menuItem`'s property set (`id`, `label`,
`icon`, `route`, `href`, `count`, `order`, `permission`, `visibleIf`) plus one
new field `description` (a card needs explanatory text a menu row doesn't).
**Why:** `menuItem` already has `count` with the same integer-or-"auto" shape
this component needs, and `route`/`href` as alternative navigation targets.
`primaryAction` is single-button-shaped (required `label`, optional
`payload`) and doesn't fit a repeated grid entry.
**Alternative considered:** Reuse `menuItemLeaf` directly instead of a new
`$def`. Rejected — `menuItemLeaf` has no `description` field and carries
`type: "caption"` / `dynamicSource` semantics that don't apply to a card.

### D2 — route/href mutual exclusion via `not` + `allOf`, not `oneOf` on the whole object

**Choice:** Express "not both, either/neither allowed" as an `allOf` guard:
`not: { required: ["route", "href"] }` alongside the existing per-property
type declarations, rather than restructuring the whole `navCardEntry` as a
`oneOf` of three sub-shapes (route-only / href-only / neither).
**Why:** A `not: { required: [...] }` guard is a two-line addition and keeps
every other property (`additionalProperties: false` included) declared once,
in one place — matching how `widgetEntry`'s own `allOf` array already layers
constraints without restructuring the base object. A three-way `oneOf` would
duplicate the full property list three times for no behavioral gain, since
"neither" is schema-valid (see spec's mutual-exclusion requirement).
**Alternative considered:** `oneOf` on `{route}` / `{href}` / `{}` sub-shapes.
Rejected for the duplication cost above.

### D3 — Widget-entry constraint follows the object-table precedent exactly

**Choice:** Add the `nav-card-grid` branch to `widgetEntry.allOf` using the
identical `if: { properties: { widgetKey: { const: "nav-card-grid" } },
required: ["widgetKey"] }` / `then: { properties: { props: { ... } } }` shape
already used for `object-table`.
**Why:** Reviewers and future maintainers scanning `widgetEntry.allOf` see one
consistent pattern for "this widgetKey needs these specific props." Diverging
shapes (e.g. a top-level `if` on the whole widgetEntry instead of nested under
`allOf`) would be a second dialect for no reason.

## Risks / Trade-offs

- **A future widget-specific `props` shape could grow `widgetEntry.allOf`
  unboundedly** → Not addressed here; this is the existing precedent's
  trade-off (already true for `object-table`), out of scope to fix in a
  chain-spec-1 schema addition.
- **`description` on `navCardEntry` has no equivalent on `menuItem`** →
  Intentional divergence (D1); documented so a future menuItem/navCardEntry
  unification effort knows this is deliberate, not an oversight.

## Migration Plan

Purely additive — no existing manifest references `navCardEntry` or
`widgetKey: "nav-card-grid"`. Ship the schema change; `cn-nav-card-grid`
(chain spec 2) is the first and only consumer. No rollback complexity: the
schema addition can be reverted independently since nothing depends on it
until spec 2 merges.
