# Tasks: Manifest config $defs

## Phase 1 — Schema additions

- [x] Append seven new `$defs` to `src/schemas/app-manifest.schema.json`
      AT THE BOTTOM of the existing `$defs` block (after `page`):
  - [x] `column` — `{ key, label, sortable?, width?, align?, formatter?, widget?, hidden? }`
  - [x] `action` — `{ id, label, icon?, permission?, primary?, confirm? }`
  - [x] `widgetDef` — `{ id, title, type, iconUrl?, iconClass?, itemApiVersions?, props? }`
  - [x] `layoutItem` — `{ id, widgetId, gridX, gridY, gridWidth, gridHeight, showTitle? }`
  - [x] `formField` — `{ key, label, type, required?, default?, enum?, widget?, help? }`
  - [x] `sidebarSection` — `{ id, label, icon?, fields? }`
  - [x] `sidebarTab` — `{ id, label, icon?, widgets?, component? }`
- [x] Each `$def` MUST include a top-level `description` and per-property
      `description`, mirroring the tone of the existing `menuItem` /
      `page` $defs.
- [x] Do NOT add `$ref`s from `config` blocks. Do NOT bump the
      schema's `version` field. Do NOT change any existing $def or
      property.

## Phase 2 — Tests

- [x] Add `tests/schemas/app-manifest-defs.spec.js`. The suite MUST:
  - [x] Confirm each new `$def` is reachable by JSON-Pointer
        (`schema.$defs.column`, etc.) and is an object with a
        `description` and `properties`.
  - [x] Validate one known-good fixture per `$def` against the
        sub-schema (using a tiny inline JSON-Schema check; Ajv is not
        a dep of this lib so we use a deterministic structural check).
  - [x] Reject one known-bad fixture per `$def` — missing required
        field, or extra property under `additionalProperties: false`.
- [x] Add 14 fixtures under `tests/fixtures/`:
  - [x] `def-column-valid.json`, `def-column-invalid.json`
  - [x] `def-action-valid.json`, `def-action-invalid.json`
  - [x] `def-widgetDef-valid.json`, `def-widgetDef-invalid.json`
  - [x] `def-layoutItem-valid.json`, `def-layoutItem-invalid.json`
  - [x] `def-formField-valid.json`, `def-formField-invalid.json`
  - [x] `def-sidebarSection-valid.json`, `def-sidebarSection-invalid.json`
  - [x] `def-sidebarTab-valid.json`, `def-sidebarTab-invalid.json`
- [x] Existing `tests/schemas/app-manifest.schema.spec.js` MUST keep
      passing (additive change verifies backwards compat).

## Phase 3 — Spec doc

- [x] Write `specs/manifest-config-defs/spec.md`. One requirement per
      `$def` (REQ-MCD-1 .. REQ-MCD-7) plus REQ-MCD-8 covering the
      "additive only — no $refs from config" constraint.

## Phase 4 — Documentation

- [x] Update `docs/migrating-to-manifest.md` with a "Schema-validated
      config shapes" section linking the new `$defs` and noting they
      are not yet referenced from `config` blocks.
- [x] Add `docs/utilities/manifest-defs.md` listing every `$def` with
      a tiny JSON example each.
- [x] Run `npm run check:docs`; resolve any coverage failures.

## Phase 5 — Verify and commit

- [x] Run `npm test`. All suites pass.
- [x] Run `npm run check:docs`. Passes.
- [x] Mark every task above `[x]`.
- [x] Commit on `feature/manifest-schema-config-defs`. NO push, NO PR.
- [x] Do NOT add `Co-Authored-By` trailers (project convention).
