---
kind: feature
---

# CnVersionHistory — object version-diff viewer

## Why

OpenRegister stores a semantic version per object (`ObjectEntity::$version`) and writes an immutable audit-trail entry on every save, with a per-field `changed` diff (`{old, new}`) already computed server-side (`AuditTrailMapper::createAuditTrail`). No layer in the fleet renders this as a usable diff: `CnAuditTrailTab` (the existing sidebar tab) shows changed fields as raw stringified values with no structural comparison, no added/removed/changed classification, no nested-diff rendering, and no way to compare across more than one adjacent change. With Rekenkamer-style scrutiny of audit completeness making before/after inspection a real compliance need, this gap is a real one. Per ADR-Leaf-First, this is built once in nc-vue rather than per-app.

## What changes

- **New pure utility** `src/utils/computeObjectDiff.js` (`computeObjectDiff(oldValue, newValue)`): a generic, Vue-independent field-by-field diff — walks nested plain objects and arrays, classifies every path as `added` / `removed` / `changed` / `unchanged`, and distinguishes an explicit `null` from an absent (`undefined`) key. This is the core of the change and is unit-tested independently of any component or backend shape.
- **New pure utility** `src/utils/auditTrailDiff.js` (`foldAuditTrailEntries(entries)`): OpenRegister's audit-trail entries carry only a per-field `changed` diff (`{fieldName: {old, new}}`), not a full before/after object snapshot (see "Design notes" below). This helper folds an ordered (oldest-first) range of audit-trail entries into a single synthetic `{oldState, newState}` pair — first-seen `old` per field, last-seen `new` per field — so a diff over an arbitrary version range reuses `computeObjectDiff` exactly like a single-entry diff.
- **New component** `CnVersionHistory` (`src/components/CnVersionHistory/CnVersionHistory.vue`): a `CnDetailCard`-based history list (mirrors `CnAuditTrailCard`'s fetch/loading/empty conventions) that lists an object's audit-trail entries newest-first (timestamp, user, semantic version, action), paginated against OpenRegister's real `GET /api/objects/{register}/{schema}/{id}/audit-trails` envelope (`results`/`total`/`page`/`limit`, `_page`/`limit`/`_sort[created]=DESC` params — the same convention `CnAuditTrailTab` already uses). Selecting one entry, or checking two entries and pressing "Compare", opens a diff view: a field | old value | new value table, changed-only by default with a "Show all fields" toggle, nested object/array values JSON-pretty-printed with per-line add/remove/change tinting via `--color-success`/`--color-error`/`--color-warning` (NC CSS variables only, no hardcoded colors).
- **New integration descriptor** `src/integrations/builtin/version-history.js` (id `version-history`, distinct from the existing `audit-trail` id so it does not collide with or replace the shipped audit-trail tab/widget), registered in `src/integrations/builtin/index.js`'s bespoke block. `CnVersionHistory` serves as both `tab` and `widget` (it is surface-aware via the standard `surface` prop, per AD-19).
- Three-tier barrel exports (`CnVersionHistory/index.js` → `src/components/index.js` → `src/index.js`) and a docs page (`docs/components/cn-version-history.md`), matching every other public component.

## Design notes — audit-trail diffs vs. full snapshots

OpenRegister does **not** store full before/after object snapshots per version. `AuditTrailMapper::createAuditTrail()` diffs `$old->jsonSerialize()` against `$new->jsonSerialize()` at write time and persists only the per-field delta (`changed: {field: {old, new}}`); there is no "list full snapshot at version N" endpoint. Consequently:
- A single audit-trail entry's diff is exactly its own `changed` map (folded through `computeObjectDiff` for consistent structural/nested rendering).
- An arbitrary-range compare (two non-adjacent entries) is reconstructed by folding every entry's `changed` map between the two selected points (`foldAuditTrailEntries`) — this recovers the correct before/after for every field that was touched anywhere in the range, but a field untouched throughout the whole range is invisible to the diff (there is no baseline snapshot to compare it against). This is a genuine backend limitation, not a viewer limitation, and is called out in the component's docs page.
- The "Show all fields" toggle therefore reveals `unchanged` entries **within already-touched fields' nested structure** (e.g. an unchanged sibling key inside a changed nested object), not top-level fields OpenRegister never reported as touched — `computeObjectDiff` is fully general (any two JS values), so a future host that does have full snapshots (e.g. a schema-versioned export) gets true full-field toggling for free.

## Non-goals

- A dedicated OpenRegister "list versions" endpoint or object-snapshot reconstruction service — out of scope for a frontend-only leaf; the fold-based reconstruction above is the documented workaround.
- Reverting to a prior version (OpenRegister already exposes `revert#revert`; a "restore this version" action can consume it in a follow-up, not part of this change).
- Modifying the existing `CnAuditTrailCard` / `CnAuditTrailTab` components or the `audit-trail` integration — this change is additive only.

## Impact

- Additive: a new component, two new pure utilities, and a new integration id. No existing component, export, or integration descriptor changes behavior.
- Cross-fleet: every app that registers the built-in integrations (or adopts `CnVersionHistory` directly) gets a structural version-diff viewer for free.

## Capabilities

### New Capabilities
- `version-diff-viewer` — `computeObjectDiff` generic nested diff utility, `foldAuditTrailEntries` audit-trail range folding, and the `CnVersionHistory` component + `version-history` integration descriptor for viewing object version/audit history with a field-by-field diff.
