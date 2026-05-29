# Manifest `type:'index'` action toggles — typed `config.actionToggles`

## Why

The opencatalogi customs-to-zero triage (issue #274 / [opencatalogi#636](https://codeberg.org/Conduction/opencatalogi/pulls/636)) flagged that 6 of the 16 customs are thin wrappers around `CnIndexPage` that exist **only** to set the action-toggle props (`showMassDelete`, `showMassCopy`, `showMassExport`, `showMassImport`, `showEditAction`, `showCopyAction`, `showDeleteAction`, `showAdd`, `showViewToggle`).

Mechanically, the renderer already forwards arbitrary `config.*` keys as Vue props on the dispatched component (see `CnPageRenderer.resolvedProps()` — `{ ...config, ...params }`), and the v2 schema's `config` field is `additionalProperties: true`. So `config.showAdd: false` and friends already work. But:

1. **Discoverability is zero** — nothing in the schema or docs says these keys are honored.
2. **Validation is silent** — a typo (`showMassDeletes: false`) silently no-ops.
3. **No typed schema** — IDE completion, hover-docs, and JSON-schema-aware editors give consumers no hint.

`config.readOnly: true` is the existing escape valve (expands to nine `show*: false` defaults via `READ_ONLY_DEFAULTS` in `CnPageRenderer`), but it's all-or-nothing and shadows any explicit `showAdd: true` an app might want to re-enable.

## What changes

1. **Schema** — add a typed `actionToggles` block under `config` for `type:'index'` pages, declaring each individual toggle as a `boolean` with a description tied to the matching `CnIndexPage` prop. `additionalProperties: true` stays so the existing shape-merge keeps working; `actionToggles` is purely sugar for grouping the toggles. (Named `actionToggles` rather than `actions` because `config.actions[]` is the existing typed row-actions array.)
2. **Validator** — extend the `index` branch of `validateTypeConfig` to type-check `config.actionToggles` as an object of booleans with the known toggle keys.
3. **Renderer** — `resolvedProps()` flattens `config.actionToggles.*` into top-level `show*: …` props before spreading. Explicit `config.showAdd` still wins (matches the existing `readOnly` precedence rule).
4. **Docs** — add a "Hiding built-in actions" section to `docs/components/cn-index-page.md` and a manifest example to `docs/migrating-to-manifest.md`.
5. **Tests** — manifest-validator tests + a `CnPageRenderer` test asserting the flattening + precedence.

## Non-goals

- New action types (those land in `manifest-actions-dispatch`).
- Permission-gated toggles (e.g. `showAdd: "@perm:isAdmin"` — separate sentinel proposal).
- Identical toggle config for `type:'detail'` row actions — handled in the matching detail-config-expansion change.

## Consumer impact

Unblocks opencatalogi: `CatalogiIndexView`, `OrganizationIndexView`, `ThemeIndexView`, `GlossaryIndexView`, `PageIndexView`, `MenuIndexView` collapse to declarative `type:'index'` entries with `config.actionToggles: { showEdit: false, showCopy: false, ... }`.

## References

- [nextcloud-vue#274](https://codeberg.org/Conduction/nextcloud-vue/issues/274) — tracking issue.
- [opencatalogi#636](https://codeberg.org/Conduction/opencatalogi/pulls/636) — consuming-app PR documenting the lib gap on each affected page.
- `CnPageRenderer.resolvedProps()` + `READ_ONLY_DEFAULTS` — existing precedent for the flattening pattern.
<!-- CI trigger probe 2026-05-20T21:08:53Z -->
