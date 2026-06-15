# Tasks: Manifest `config.sidebarTabs[]` — typed + validated

## Phase 1 — Schema

- [x] Add a `sidebarTabs` typed array property under `config` in `src/schemas/app-manifest-v2.schema.json`. Each entry MUST have `id` (string) + `label` (string); optional `icon` (string), `order` (number), `component` (string), `_note` (string).
- [x] Bump schema `version` 2.1.0 → 2.2.0.

## Phase 2 — Validator

- [x] Add `validateDetailSidebarTabs(cfg, pathSlash, pathBracket, errors)` helper in `src/utils/validateManifest.js`:
  - skip when `cfg.sidebarTabs` is absent.
  - non-array → `${pathSlash}/sidebarTabs: must be an array`.
  - empty array → tolerated (no entries to check).
  - each entry: object with required `id`+`label` strings; otherwise typed errors with the array index in the path.
  - duplicate `id`s across entries → typed error.
- [x] Add `validateSidebarTabGroupRefs(page, index, errors)` that runs after sidebarTabs validation:
  - collect declared `config.sidebarTabs[].id` values.
  - walk `page.widgets[]` looking for entries with `slot === 'sidebar'` and a `tabGroup` value.
  - emit `pages[<idx>]/widgets/<wIdx>/tabGroup: "<value>" must match a declared config.sidebarTabs[].id` when unmatched.
- [x] Wire both helpers into the `case 'detail':` branch of `validateTypeConfig`. Helpers run regardless of whether `sidebarTabs` is set (cross-ref helper still emits errors when widgets reference an undeclared tabGroup).

## Phase 3 — Tests

- [x] `tests/utils/validateManifest.detailSidebarTabs.spec.js`:
  - omitted sidebarTabs validates.
  - empty array validates.
  - well-formed tabs validate.
  - missing id rejects with path.
  - missing label rejects with path.
  - duplicate ids reject.
  - non-array rejects.
  - widgets[] referencing an unknown tabGroup rejects.
  - widgets[] referencing a declared tabGroup passes.

## Phase 4 — Docs

- [x] In `docs/components/cn-detail-page.md`, add a "Sidebar tabs from a manifest" section pointing at the typed shape + the cross-reference rule.
- [x] Migration guide gains a sidebarTabs example matching the opencatalogi fix.
