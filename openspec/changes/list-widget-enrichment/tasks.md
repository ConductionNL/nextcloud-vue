# Tasks: list-widget-enrichment

Every task targets `beta`, Vue 2.7 Options API, new props default to no-op, `cn-` CSS prefix, Nextcloud CSS variables only. Run `npm test` + `npm run build` after each group.

## 1. Schema + validator regen

- [x] 1.1 Add the `source` object shape (`register`, `schema`, `filter`, `order`, `limit`) to `object-table` widget props, the `object-op` action `$def` (`op` enum `patch|delete|create`, `values` object, `confirm` boolean), and the `entries[]` array to `stats-block` widget props in the v2 schema. — spec_ref: "v2 manifest schema and compiled validator accept the new fields" — files: `src/schemas/app-manifest-v2.schema.json`
- [x] 1.2 Regenerate the compiled validator via `node scripts/build-validators.js` (never hand-edit the artifact) and verify it loads. — spec_ref: same — files: `scripts/build-validators.js`, `src/**/validateManifestV2.compiled.js`

## 2. object-table enrichment

- [ ] 2.1 Add `source` prop (default `null`) to `CnWidgetObjectTable`; resolve `source.filter` via `resolveFilterTokens` + `dropOptionalUnresolved`, pass `@resolve:` register sentinels through unexpanded, drive `CnDataTable` self-fetch with `source.order`/`source.limit`; external `rows` still win. — spec_ref: "object-table accepts a declarative self-fetching source" — files: `src/components/CnWidgetObjectTable/CnWidgetObjectTable.vue`, `src/utils/resolveFilterTokens.js`
- [ ] 2.2 Add pass-through props to `CnWidgetObjectTable`: `columns` object form, `hideHeader`, `rowRoute`, `viewAllRoute`/`viewAllLabel`, `emptyText`, `rowIcon` (string | fn), and forward the `#footer` `{ total, shown }` slot. — spec_ref: same — files: `src/components/CnWidgetObjectTable/CnWidgetObjectTable.vue`, `src/components/CnDataTable/CnDataTable.vue`
- [ ] 2.3 JSDoc every new/changed prop, event, and slot on `CnWidgetObjectTable` (100% coverage). — spec_ref: same — files: `src/components/CnWidgetObjectTable/CnWidgetObjectTable.vue`

## 3. Relative-day formatters

- [x] 3.1 Add `daysUntil` (future → "N days remaining", today → "Due today", past → "N days overdue") and `daysSince` (past → "N days ago", today → "Today") to `BUILT_IN_FORMATTERS`, i18n'd via `translate`/`translatePlural` (`nextcloud-vue`), null-safe (return original/empty, never throw). — spec_ref: "Generic daysSince and daysUntil display formatters" — files: `src/utils/builtInFormatters.js`

## 4. Row actions + object-op + confirm dialog

- [ ] 4.1 Add an `object-op` case to `dispatchAction`: dispatch `patch`/`create` via `useObjectStore.saveObject` and `delete` via `deleteObject` against the context's `source` register/schema + row; surface backend (RBAC) errors without mutating local state; ignore any authorization-shaped fields. — spec_ref: "Declarative row actions include an object-op mutation type" — files: `src/utils/actionsDispatcher.js`, `src/store/useObjectStore.js`
- [ ] 4.2 Create `src/dialogs/CnConfirmDialog.vue` — generic NcDialog-based two-phase confirm→result dialog, `variant:"error"` for destructive, own file per modal-isolation. — spec_ref: same — files: `src/dialogs/CnConfirmDialog.vue`, `src/index.js`
- [ ] 4.3 Add an `actions[]` prop to `CnWidgetObjectTable`; render row-scoped `patch`/`delete` (and reused `handler|open-modal|open-page|navigate`) actions via `CnRowActions`; always confirm `delete`, confirm `patch`/`create` only on `confirm:true`, routing confirms through `CnConfirmDialog`. — spec_ref: same + "delete always confirms; patch/create confirm only on opt-in" — files: `src/components/CnWidgetObjectTable/CnWidgetObjectTable.vue`, `src/components/CnRowActions/CnRowActions.vue`
- [ ] 4.4 Render an `object-op` `create` action as a widget-scoped footer/header affordance (not in the row menu), creating a new object from `values` against the widget `source`. — spec_ref: "object-op create is widget-scoped; patch and delete are row-scoped" — files: `src/components/CnWidgetObjectTable/CnWidgetObjectTable.vue`

## 5. stats-block multi-entry

- [ ] 5.1 Add optional `entries[]` prop to `CnStatsBlockWidget`; relax `dataSource` to a "exactly one of dataSource/entries" validator; render N `CnStatsBlock` KPIs when `entries` is set, single-source path unchanged when absent. — spec_ref: "stats-block supports multi-entry declarative sources" — files: `src/components/CnStatsBlockWidget/CnStatsBlockWidget.vue`
- [ ] 5.2 Fetch each entry's count over the REST `/value` aggregation (refactor `fetchRest` to run per entry) honouring per-entry `route`, `variant`, `countLabel`, and `hideWhenZero` (omit when count === 0). — spec_ref: same — files: `src/components/CnStatsBlockWidget/CnStatsBlockWidget.vue`, `src/utils/resolveFilterTokens.js`

## 6. Tests, docs, partials

- [ ] 6.1 Unit tests (`@vue/test-utils`) for `CnWidgetObjectTable` `source` self-fetch + token resolution + external-rows-win + pass-through props. — spec_ref: "object-table accepts a declarative self-fetching source" — files: `tests/components/CnWidgetObjectTable/*.spec.js`
- [ ] 6.2 Unit tests for `daysSince`/`daysUntil` (future/today/past + null/unparseable) and for `dispatchAction` `object-op` (patch/create/delete, confirm gating, RBAC-error no-local-mutation, authority-field ignored). — spec_ref: formatters + object-op requirements — files: `tests/utils/builtInFormatters.spec.js`, `tests/utils/actionsDispatcher.spec.js`
- [ ] 6.3 Unit tests for `CnConfirmDialog` (confirm/cancel/result phases) and `CnStatsBlockWidget` multi-entry (`entries` render, `hideWhenZero`, single-source backward-compat) + a schema test asserting a new-field manifest validates and an invalid `op` fails. — spec_ref: stats-block + schema requirements — files: `tests/dialogs/CnConfirmDialog.spec.js`, `tests/components/CnStatsBlockWidget/*.spec.js`, `tests/schemas/*.spec.js`
- [ ] 6.4 Add/update component reference docs (`docs/components/`) for `CnWidgetObjectTable`, `CnStatsBlockWidget`, `CnConfirmDialog`, and the new formatters; regenerate docusaurus partials; confirm `npm run build`, `check:jsdoc`, and `check:docs` pass. — spec_ref: all — files: `docs/components/*.md`, `docusaurus/**`

## Acceptance criteria

- `object-table` renders a fleet dashboard list purely from manifest `props` (`source` + `columns` + `hideHeader` + `rowRoute` + `viewAllRoute` + `emptyText`) with no bespoke component; `@me`/`@workspace.*` resolve and `?`-optional clauses drop when empty; `@resolve:` passes through.
- Passing only `rows`/`columns` to `object-table` behaves exactly as before (no self-fetch).
- `daysUntil`/`daysSince` render correct i18n'd relative phrasing and never throw on bad input.
- `object-op` `patch`/`create`/`delete` dispatch via `useObjectStore`; `delete` always confirms; `patch`/`create` confirm only on `confirm:true`; RBAC rejection surfaces an error with no local mutation; authorization-shaped fields have no effect.
- `create` renders as a widget-scoped footer action, `patch`/`delete` per row.
- `stats-block` renders multiple KPIs from `entries[]` with `hideWhenZero`; the single-`dataSource` path is unchanged.
- New schema fields validate; the compiled validator is regenerated (not hand-edited); an invalid `op` fails validation.
- `npm test` and `npm run build` are green; new components/props/events/slots are 100% JSDoc'd with reference docs + regenerated partials; no `--nldesign-*` references; `cn-` prefix + Nextcloud CSS variables only.
