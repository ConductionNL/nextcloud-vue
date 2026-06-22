## ADDED Requirements

### Requirement: Widget entries carry an optional stable identity

The v2 `widgetEntry` schema SHALL accept an optional `id` field (string, kebab-case) while keeping `additionalProperties: false`. Manifests that omit `id` SHALL remain valid. The `id`, when present, SHALL be the merge key for `widgets[]` entries under delta mode.

> @e2e exclude unit-tested via jest (utils/validator/loader specs — no browser surface)

#### Scenario: Manifest without widget ids stays valid
- **WHEN** `validateManifest` runs on a v2 manifest whose widget entries have no `id`
- **THEN** validation SHALL pass

#### Scenario: Widget id is accepted and additionalProperties stays closed
- **WHEN** a widget entry declares `"id": "revenue-kpi"` plus the required fields
- **THEN** validation SHALL pass
- **AND** an unknown field on the same entry SHALL still fail validation

### Requirement: mergeManifestDelta applies a keyed structural delta to a base manifest

The library SHALL export a pure function `mergeManifestDelta(base, delta)` that returns a new manifest. Plain objects SHALL merge recursively. The `pages[]` array SHALL merge by `page.id` and the `widgets[]` array SHALL merge by `widget.id`: a delta entry whose key matches a base entry SHALL be merged into it; a delta entry whose key is new SHALL be appended. Arrays without a keyed identity SHALL be replaced wholesale (preserving today's semantics).

> @e2e exclude unit-tested via jest (utils/validator/loader specs — no browser surface)

#### Scenario: Patch an existing page without resending siblings
- **WHEN** `mergeManifestDelta` is called with a base containing pages `a` and `b`, and a delta containing only page `a` with a changed `title`
- **THEN** the result SHALL contain page `a` with the new title AND page `b` unchanged

#### Scenario: Append a new widget to an existing page
- **WHEN** the delta adds a widget entry with an `id` not present in the base page's `widgets[]`
- **THEN** the result page SHALL contain the base widgets AND the new widget

### Requirement: Delta markers express removal and reordering

A delta entry of the form `{ "$op": "remove" }` keyed to an existing entry SHALL delete that entry from the merged array. An optional `__order: [<id>, ...]` on a keyed array SHALL reorder the merged entries to the listed id sequence, with any unlisted entries retained in their original relative order after the listed ones. The reserved keys `$op` and `__order` SHALL be rejected by `validateManifest` when they appear in a non-delta manifest.

> @e2e exclude unit-tested via jest (utils/validator/loader specs — no browser surface)

#### Scenario: Remove a base page via delta
- **WHEN** the delta contains `{ "id": "b", "$op": "remove" }`
- **THEN** the merged manifest SHALL NOT contain page `b`

#### Scenario: Reorder widgets via __order
- **WHEN** a delta sets `__order: ["w2", "w1"]` on a page whose base widgets are `w1, w2`
- **THEN** the merged widgets SHALL be ordered `w2, w1`

#### Scenario: Reserved markers rejected outside delta mode
- **WHEN** `validateManifest` runs on a bundled (non-delta) manifest containing `$op` or `__order`
- **THEN** validation SHALL fail with an error naming the reserved key

### Requirement: Orphaned delta patches are non-fatal and surfaced

When a delta entry's key matches no entry in the base, `mergeManifestDelta` SHALL skip it rather than create it from a patch, SHALL emit a `console.warn`, and SHALL record its path. The manifest loaders SHALL expose these paths on an `orphanedDeltaPaths` reactive ref, mirroring the existing `unresolvedSentinels` contract.

> @e2e exclude unit-tested via jest (utils/validator/loader specs — no browser surface)

#### Scenario: Delta targets a page the base no longer has
- **WHEN** a delta patches page `gone` that does not exist in the base
- **THEN** the merged manifest SHALL render without page `gone`
- **AND** `orphanedDeltaPaths` SHALL include the path to `gone`

### Requirement: diffManifest produces a minimal delta consumable by mergeManifestDelta

The library SHALL export a pure function `diffManifest(base, edited)` returning a delta such that `mergeManifestDelta(base, diffManifest(base, edited))` deep-equals `edited` for all keyed arrays. When `edited` removes a keyed base entry, the delta SHALL contain a `{ "$op": "remove" }` marker. When a mergeable array lacks stable ids on its entries, `diffManifest` SHALL emit a whole-array replacement for that array and SHALL warn.

> @e2e exclude unit-tested via jest (utils/validator/loader specs — no browser surface)

#### Scenario: Round-trip a single-field edit
- **WHEN** `edited` differs from `base` only in one page's `title`
- **THEN** `diffManifest(base, edited)` SHALL contain only that page keyed by id with the changed title
- **AND** applying the delta to `base` SHALL reproduce `edited`

#### Scenario: Round-trip a removal
- **WHEN** `edited` drops a page present in `base`
- **THEN** the delta SHALL carry a `$op:"remove"` for that page id
- **AND** applying it SHALL reproduce `edited`

### Requirement: Manifest loaders support an opt-in delta merge mode

`useAppManifest` and `useRuntimeManifest` SHALL accept `options.mergeStrategy: 'delta'`. When set, the fetched payload SHALL be treated as a delta and applied to the base (bundled manifest for `useAppManifest`, stub for `useRuntimeManifest`) via `mergeManifestDelta`. When `mergeStrategy` is absent or any other value, each loader's current default path SHALL run unchanged — `useAppManifest` deep-merges, `useRuntimeManifest` fully replaces.

> @e2e exclude unit-tested via jest (utils/validator/loader specs — no browser surface)

#### Scenario: Delta mode merges against the base
- **WHEN** `useAppManifest(appId, bundled, { mergeStrategy: 'delta' })` fetches a delta payload
- **THEN** the resolved manifest SHALL equal `mergeManifestDelta(bundled, payload)`

#### Scenario: Default mode is unchanged
- **WHEN** a loader is called without `mergeStrategy`
- **THEN** its existing behaviour (deep-merge for `useAppManifest`, full replace for `useRuntimeManifest`) SHALL be preserved exactly
