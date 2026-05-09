# Tasks: Manifest config $refs

## Phase 1 — Schema $ref wiring

- [x] Update `src/schemas/app-manifest.schema.json` page-type
      `config` blocks to ref the seven existing `$defs`. The
      `pages[].config.description` already documents the per-type
      shapes; the change is structural (`properties` blocks +
      `$ref`s).
- [x] `index.config.columns[]` — accept `oneOf: [{type:string},
      {$ref: column}]` (string = legacy shorthand kept for
      back-compat).
- [x] `index.config.actions[]` — `$ref action`.
- [x] `index.config.sidebar.columnGroups[]` — `$ref sidebarSection`.
- [x] `detail.config.sidebar` — promote to
      `oneOf: [{type:boolean}, {type:object, additionalProperties:
      true, properties: {tabs[]: $ref sidebarTab}}]`.
- [x] `detail.config.sidebarProps.tabs[]` — `$ref sidebarTab`.
- [x] `dashboard.config.widgets[]` — `$ref widgetDef`.
- [x] `dashboard.config.layout[]` — `$ref layoutItem`.
- [x] `settings.config.sections[].fields[]` — `$ref formField`.
- [x] `logs.config.columns[]` — accept the same
      `oneOf: [{type:string}, {$ref: column}]` as index (covered by
      the same shared `columns` property block).
- [x] Bump schema `version` from `1.1.0` to `1.2.0`.
- [x] Keep `pages[].config.additionalProperties: true` on every
      page-type (the OUTER block stays open; only inner array items
      become typed).
- [x] Keep `widgetDef.props.additionalProperties: true` (per-widget
      shape stays open).
- [x] Update each $def's top-level `description` so the trailing
      "NOT YET REFERENCED" sentence flips to "As of schema 1.2.0
      referenced from …".

## Phase 2 — FE validator alignment

- [x] Read `src/utils/validateManifest.js`. Identify the spots
      where the schema is now stricter than the FE validator.
- [x] Add `validateColumnsArray` / `validateActionsArray` /
      `validateWidgetsArray` / `validateLayoutArray` /
      `validateFieldsArray` helpers and wire them into the
      per-type `validateTypeConfig` switch.
- [x] When `type === 'dashboard'`, validate `config.widgets[].id|
      title|type` are present non-empty strings; layout entries
      pass the gridX/Y/Width/Height int + minimum checks from the
      `layoutItem` $def.
- [x] When `type === 'index' || type === 'logs'`, accept either a
      string-shorthand columns entry or an object with `key` +
      `label`. For `actions[]` (index only), require `id` + `label`
      strings.
- [x] Within `validateTypeConfig`'s `settings` branch, when a
      section uses `fields[]` body kind, validate each field's
      `key|label|type` per `formField` (type ∈
      `boolean|number|string|enum|password|json`).
- [x] Keep all existing FE validator rules (semver, page id
      uniqueness, custom-component requirement, sidebar tabs id
      uniqueness, sidebar tabs widgets-OR-component mutual
      exclusion, settings section body kind exactly-one, widgets[]
      type non-empty).
- [x] Don't duplicate the schema's `additionalProperties: false`
      checks in the FE — those produce noisy messages without
      hints.

## Phase 3 — Tests

- [x] Add `tests/schemas/app-manifest-refs.spec.js`. The suite
      provides a `$ref`-resolving structural validator (extends
      the one in `app-manifest-defs.spec.js` to follow `$ref` /
      `oneOf`) and asserts:
  - [x] For each ref'd `config` path, a known-good fixture
        passes.
  - [x] For each ref'd `config` path, a fixture missing a
        required `$def` field fails with a path-shaped error.
  - [x] The schema's top-level `version` is `"1.2.0"`.
  - [x] `pages[].config.additionalProperties` is still `true` on
        the outer block.
- [x] Update `tests/schemas/app-manifest.schema.spec.js` —
      every assertion that pinned `schema.version === '1.1.0'`
      flips to `'1.2.0'` (5 sites total across both files).
- [x] Update `tests/schemas/app-manifest-defs.spec.js` — the
      `schema.version` assertion flips to `'1.2.0'` and the
      assertion that `pages[].config.additionalProperties` is
      still `true` stays — the OUTER block is still open.
- [x] Add tests confirming `validateManifest()` against
      `manifest-valid.json`, `manifest-all-types.json`,
      `manifest-settings-rich.json`, `manifest-sidebar-show.json`
      all return `{ valid: true, errors: [] }` after the bump
      (covered by the inline `it.each` in the new spec).
- [x] Add inline tests confirming the FE validator surfaces
      missing widget `type`, missing action `label`, settings
      field type-enum violation, and `gridWidth: 0` errors. Used
      inline construction instead of new fixture files because the
      fixture path adds no value over inline literals (the asserts
      live next to the construction).

## Phase 4 — Docs

- [x] Update `docs/utilities/manifest-defs.md` — add a
      "References from `pages[].config`" section with the mapping
      table; update the introduction to reflect that the defs are
      now referenced (no longer "additive documentation today").
- [x] Update `docs/migrating-to-manifest.md` — the
      "Schema-validated config shapes" section moves from "deferred
      to a follow-up" to "live; here's what error messages look
      like."
- [x] `npm run check:docs` MUST pass.

## Phase 5 — Verification

- [x] `npm test` — every existing test plus the new spec passes.
- [x] Mark every `[ ]` in this file as `[x]`.
- [x] Commit on `feature/manifest-config-refs` (no
      `Co-Authored-By` trailer). Do NOT push.
