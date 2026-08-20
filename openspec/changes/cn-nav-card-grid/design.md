## Context

See proposal.md - Why, and `cn-nav-card-grid-schema`'s design.md for the
`navCardEntry` shape this component consumes. Relevant existing code, all
verified in this repo:

- `src/components/CnWidgetCardGrid/CnWidgetCardGrid.vue` — the closest
  sibling: renders `CnWidgetWrapper` chrome + a CSS grid of `CnObjectCard`
  from `props.objects`. `CnNavCardGrid` follows the same file layout
  (single `.vue`, docblock header, scoped `<style>` at the bottom, `cn-`
  prefixed classes) but its cards are navigation links, not `CnObjectCard`.
- `src/components/CnWidgetGrid/builtInWidgets.js` — `BUILT_IN_WIDGETS` is a
  flat `{ key: Component }` map; `CnWidgetGrid` resolves `widgetKey` against
  it first, `cnRegistry` inject second (`CnWidgetGrid.vue` `resolvedWidgets`
  computed, line ~241).
- `src/components/CnAppRoot/CnAppRoot.vue` — `cnMenuCounts: reactive({})` is
  provided (line ~1480), populated by `_hydrateMenuCounts()` (line ~2853),
  which currently walks only `this.manifest.menu` via `collectAutoTargets`.
  `cnManifest` is provided as a getter (line ~660).
- `src/utils/buildManifest.js` `applyMenuRemovals` — deletes leaf nodes from
  `menu` entirely once relocated (confirmed by reading the function: `prune`
  drops any id in the `removals` set). This is why cards-collapse leaves
  disappear from `manifest.menu`, and therefore from `_hydrateMenuCounts`'s
  existing walk.

## Goals / Non-Goals

**Goals:**
- Ship a component that renders `navCardEntry[]` as an accessible, keyboard-
  operable card grid, matching `CnWidgetCardGrid`'s file/doc/test conventions.
- Make `count: "auto"` actually resolve for nav-card-grid entries end-to-end,
  which requires extending `CnAppRoot._hydrateMenuCounts()` — not just
  documenting the injection contract.
- Prove the manifest-only render path: a `nav-card-grid` widget declared in a
  manifest with zero consumer Vue code renders correctly.

**Non-Goals:**
- Per-app adoption (writing `menu-layout.json` relocations, authoring actual
  card entries for a specific app's deep menu group) — future, per-app work.
- A new manifest page `type`. Placement is the existing `type: "dashboard"`
  page + one full-grid widget, per the proposal's rationale.
- Roving-tabindex or custom keyboard handling — native elements only.

## Decisions

### D1 — Native `<router-link>`/`<a>`, no custom focus management

**Choice:** Each card is a `<router-link>` (when `route` resolves) or `<a>`
(when `href` is set) or a `<div role="link" aria-disabled="true">`-shaped
non-interactive element (when `route` is set but unresolvable). No
`tabindex` juggling, no `@keydown.enter` handler.
**Why:** Native focusable/activatable elements already satisfy "tab reaches
it, Enter activates it" for free. Adding a roving-tabindex grid pattern (as
used for e.g. toolbar/menu widgets) is the wrong ARIA pattern here — this is
a set of independent links, not a composite widget with one tab stop.
**Alternative considered:** `role="grid"` + roving tabindex (like a data
grid). Rejected — that pattern is for cell-level 2D navigation; a link grid
is just N standalone links, each its own natural tab stop.

### D2 — No aria-label; description via aria-describedby

**Choice:** The card's accessible name is computed from its rendered text
content (label, and icon if the icon component renders accessible text —
otherwise the icon is `aria-hidden`). When `description` is present, the
card carries `aria-describedby` pointing at the description element's id;
no `aria-label` is set anywhere on the card.
**Why:** An explicit `aria-label` on an element that already has visible text
content REPLACES the accessible name computation rather than supplementing
it (WAI-ARIA "Accessible Name and Description Computation" — `aria-label`
short-circuits content-based naming). Setting `aria-label` to the same text
as `label` would be redundant; setting it to something richer than `label`
would silently diverge visible text from the announced name. `aria-describedby`
is the correct mechanism for supplementary text alongside a name.

### D3 — Disabled-route detection resolves against injected cnManifest, once, at render

**Choice:** For each entry with a `route`, the component checks whether
`cnManifest.pages` contains a page with that `id`. If not found, the card
renders disabled and a single `console.warn('[CnNavCardGrid] entry "<id>"
targets unresolved route "<route>"')` fires — deduplicated per entry id via a
component-instance `Set` so re-renders (e.g. reactive manifest updates) don't
spam the console.
**Why:** ADR-044 §5 forbids losing a reachable function silently; a
disabled+flagged card is the visible signal that something in the manifest
is wrong, matching how the equivalent unresolved-sentinel pattern elsewhere
in this library (`unresolvedSentinels`) surfaces staleness rather than
crashing or vanishing.
**Alternative considered:** Throw / render nothing. Rejected on both counts —
throwing breaks the whole widget for one bad entry; rendering nothing is
exactly the silent-loss ADR-044 §5 forbids.

### D4 — cnMenuCounts hydration must be extended in CnAppRoot, not routed around

**Choice:** Extend `_hydrateMenuCounts()`'s target-collection step
(currently `collectAutoTargets(menu)`) to also walk `manifest.pages[].widgets[]`
looking for `widgetKey === "nav-card-grid"` entries, extracting the same
`{ register, schema }` pairs from each `count: "auto"` `navCardEntry` whose
`route` resolves to an index page. Both target lists feed the same
de-duplication + batched-counts call that already exists.
**Why:** This is the only place `cnMenuCounts` gets populated. Not extending
it would make `count: "auto"` in a `navCardEntry` a documented-but-broken
feature — exactly the "a documented capability that can render nowhere"
failure mode this whole change exists to close. The alternative (component
fetches its own counts) was explicitly rejected by the task brief ("The
component does NO data fetching").
**Alternative considered:** Have `CnNavCardGrid` itself call the batched
counts endpoint on mount. Rejected per the brief's explicit constraint, and
because it would duplicate the request `CnAppRoot` already makes for `menu`
targets — two round trips instead of one merged batch.

### D5 — Dashboard placement reuses GridStack; the saving is architectural, not bundle-weight

**Choice (documented, not implemented here — no new page type):** Ship no
new manifest `type`. The intended placement is `type: "dashboard"` +
`config.allowEdit: false` + one full-grid `nav-card-grid` widget.
**Why, corrected from the naive framing:** `CnWidgetGrid.vue` imports
`initGridStack` eagerly and `CnDashboardPage.vue`/`CnDashboardGrid.vue`
import `gridstack` directly — reusing the dashboard page does NOT avoid
pulling in GridStack, it guarantees it loads. The real trade-off is
different: every app in ADR-044's scope already renders at least one
`type: "dashboard"` page elsewhere in its manifest, so GridStack is already
in that app's bundle graph — this widget adds no *incremental* weight for
those apps. A brand-new page type would instead add a permanent
renderer-dispatch branch in `CnPageRenderer` and a second layout/grid path
to maintain, for a placement need fully covered by the existing type. An app
with **no** dashboard anywhere (hypothetically) would pull in GridStack for
the first time via this widget — an honest cost, and the reason this
decision is recorded here rather than asserted as free.
**Alternative considered:** New `type: "cards"` page. Rejected — the
per-decision-1 file avoids adding page types when an existing one already
fits (ADR-036 Decision 7's "shrink `type: custom`" spirit applies in reverse
here too: don't grow the page-type enum when a typed composition already
covers it).

## Risks / Trade-offs

- **`console.warn` dedup is per-component-instance, not per-app-session** →
  a page revisit re-warns. Acceptable — it's a development-time signal, not
  user-facing, and matches the cost/benefit of other one-shot warns in this
  library (`unresolvedSentinels` is also per-load, not globally memoized).
- **Extending `_hydrateMenuCounts()` couples `CnAppRoot` to the `nav-card-grid`
  widget key by name** → Same coupling shape `collectAutoTargets` already has
  to `menu[].count === "auto"`; not a new category of coupling, just a
  second walk of the same kind.
- **GridStack cost for a dashboard-less app** → see D5; documented, not
  mitigated in this change (would require a lazy-GridStack change, out of
  scope).

## Migration Plan

Purely additive. No existing manifest declares `widgetKey: "nav-card-grid"`,
so no rendering path changes for any current consumer. Per-app adoption
(ADR-044 §4 cards-collapse rollout) is separate future work per app. Rollback:
revert the `BUILT_IN_WIDGETS` registration and the `CnAppRoot` hydration
extension — both are additive, isolated diffs with no data migration.
