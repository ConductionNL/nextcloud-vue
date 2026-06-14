# Tasks: Manifest `type:'index'` action toggles

## Phase 1 — Schema

- [x] Add an `actions` property to the `config` `$def` shared by `type:'index'` pages in `src/schemas/app-manifest-v2.schema.json`. Type `object`; each known toggle key declared as a `boolean` with a description tying it back to the matching `CnIndexPage` prop.
- [x] Bump the schema `version` field from `2.0.0` to `2.1.0`.

## Phase 2 — Validator

- [x] Add a `validateIndexActionToggles(cfg, pathSlash, pathBracket, errors)` helper in `src/utils/validateManifest.js`. It MUST:
  - skip when `cfg.actions` is absent.
  - emit `${pathSlash}/actions: ${pathBracket}.actions: must be an object` when present-but-not-object.
  - for each key, emit `${pathSlash}/actions/<key>: must be a boolean` when not a boolean.
  - allow unknown keys (forward-compat).
- [x] Wire `validateIndexActionToggles` into the `case 'index':` branch of `validateTypeConfig` alongside the existing column/actions validators.

## Phase 3 — Renderer

- [x] In `CnPageRenderer.vue`'s `resolvedProps()` computed, after the `readOnly` shortcut and before the final spread, extract `config.actions` (if it's a plain object) and merge each `actions.<key>` into the top-level `config.*` namespace UNDER any explicit `config.<key>` (so `config.showAdd: true` still wins over `config.actions.showAdd: false`).
- [x] Strip the `actions` key from the forwarded config so it doesn't leak as a Vue prop.

## Phase 4 — Tests

- [x] Add validator-level tests covering omit/empty/typed/non-object/non-boolean/unknown-key cases.
- [x] Add a `CnPageRenderer` test asserting the flattening + precedence.

## Phase 5 — Docs

- [x] In `docs/components/cn-index-page.md`, add a "Hiding built-in actions" section showing a manifest snippet declaring `config.actions`.
- [x] Update migration guide with an opencatalogi-style example.

## Phase 6 — Consumer migration (opencatalogi)

(Not in this PR — documented as the unlock case for `opencatalogi#636`.)

- [x] Open follow-up PR on opencatalogi flipping CatalogiIndexView / OrganizationIndexView / ThemeIndexView / GlossaryIndexView / PageIndexView / MenuIndexView from `type:'custom'` to `type:'index'` + `config.actions`. [DEFERRED — consumer-repo migration, explicitly "Not in this PR" per the Phase 6 heading text.]
