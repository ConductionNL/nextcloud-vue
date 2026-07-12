# Tasks: pages-editor-datasources-refresh

Spec: `openspec/changes/pages-editor-datasources-refresh/specs/pages-editor-data-sources/spec.md`
Design: `openspec/changes/pages-editor-datasources-refresh/design.md`

## 1. CnAppRoot — loader prop, reactive holder, refresh action

Spec ref: "CnAppRoot SHALL accept an optional `dataSourcesLoader` prop", "CnAppRoot SHALL provide a stable reactive data-source holder", "CnAppRoot SHALL provide a `cnRefreshDataSources()` action".
Files likely affected: `src/components/CnAppRoot/CnAppRoot.vue`.

- [x] 1.1 Add the `dataSourcesLoader` prop (`type: Function, default: null`, async `() => ({ registers })`) with full JSDoc; leave the existing `dataSources` prop untouched.
- [x] 1.2 Add a stable reactive `data()` holder `dataSourcesState: { value: null, loading: false, error: null, hasLoader: false }`; initialise `hasLoader` from the loader prop and seed `value` from the `dataSources` snapshot when one is passed.
- [x] 1.3 Provide `cnDataSourcesState` (the holder, by reference — never reassigned) and `cnRefreshDataSources` (bound async method) from `provide()`; keep providing the legacy `cnDataSources` key unchanged, and document the stable-identity contract in the provide comment block.
- [x] 1.4 Implement `refreshDataSources()`: no-op without a loader; reuse the in-flight promise; set `loading` and clear `error` while retaining the previous `value` (stale-while-revalidate); replace `value` on success; capture `error` and keep the last good `value` on rejection or a synchronous throw; always clear `loading`.

## 2. Pickers — resolve the holder, fall back to the snapshot

Spec ref: "The pickers SHALL prefer the live holder and fall back to the static snapshot".
Files likely affected: `src/components/CnPageTreeNode/CnPageTreeRow.vue`, `src/modals/CnPageConfigModal.vue`.

- [x] 2.1 In `CnPageTreeRow`, inject `cnDataSourcesState` (`{ default: null }`) alongside the existing `cnDataSources`, add an `effectiveDataSources` computed (`holder.value ?? cnDataSources`), and drive `hasDataSources` / `registerOptions` / `schemaOptions` / `columnOptions` from it.
- [x] 2.2 Apply the identical injection + `effectiveDataSources` resolution in `CnPageConfigModal`, whose `schemaOptions()` is a byte-equivalent duplicate of `CnPageTreeRow`'s.

## 3. Refresh on modal open

Spec ref: "The pages-editor modals SHALL refresh data sources when opened".
Files likely affected: `src/modals/CnEditPagesModal.vue`, `src/modals/CnPageConfigModal.vue`.

- [x] 3.1 Inject `cnRefreshDataSources` (`{ default: null }`) into `CnEditPagesModal` and call it from `mounted()` (both modals are `v-if`-mounted, so mount == open); do not trigger a refresh from `CnPageTreeRow`.
- [x] 3.2 Do the same in `CnPageConfigModal`.

## 4. Loading and error surface

Spec ref: "The pickers SHALL surface loading and error states".
Files likely affected: `src/components/CnPageTreeNode/CnPageTreeRow.vue`, `src/modals/CnPageConfigModal.vue`.

- [x] 4.1 Bind `:loading` on the Register and Schema `NcSelect`s to the holder's `loading` flag, and widen the picker gate to `hasDataSources || loading || hasLoader` so a configured loader never flashes the free-text inputs.
- [x] 4.2 Render an inline `NcNoteCard type="error"` above the pickers when the holder carries an `error`, with a retry control that re-invokes `cnRefreshDataSources()`; use English i18n keys via `t('nextcloud-vue', …)` and Nextcloud CSS variables only.

## 5. Tests and documentation (library)

Files likely affected: `tests/components/CnAppRoot*.spec.js`, `tests/components/CnPageTreeRow.spec.js`, `tests/components/` (modal specs), `docs/components/cn-app-root.md`, `docs/components/cn-edit-pages-modal.md`, `docs/components/_generated/`.

- [x] 5.1 Add `CnAppRoot` tests: loader prop default; holder identity stays stable while contents change and a deep descendant re-renders; refresh de-dupes concurrent calls; a rejecting loader sets `error` and keeps the last good `value`; refresh without a loader is a no-op.
- [x] 5.2 Add picker tests: holder wins over snapshot; snapshot used when the holder is empty; snapshot-only consumer behaves exactly as before; neither prop still yields free-text fields; loading state and error notice render; each modal calls `cnRefreshDataSources()` exactly once on mount.
- [x] 5.3 Update `docs/components/cn-app-root.md` (new prop + the two new provide keys) and the touched components' docs; regenerate the `docs/components/_generated/` partials; keep `npm run check:docs`, `npm run check:jsdoc`, `npm test` and `npm run build` green.

## 6. OpenBuild — pass a loader, unify the producers

Repo: `openbuild` (separate worktree — `/home/rubenlinde/nextcloud-docker-dev/workspace/server/apps-extra/.claude/worktrees/openbuild-datasources-refresh`).
Spec ref: "OpenBuild SHALL pass a loader instead of prefetching at boot".
Files likely affected: `src/composables/useRegisterPicker.js`, `src/builder.js`, `src/views/BuilderHost.vue`.

- [x] 6.1 Give `useRegisterPicker.fetchDataSources()` an optional bounded register set (per-app `openbuild-{slug}` + registers referenced by manifest pages' `config.register` + declared `Application.dataRegisters`), so it stops fanning schema requests out over every register on the instance; keep the existing no-argument call shape working, and keep using the register-scoped `GET /registers/{slug}/schemas`.
- [x] 6.2 In `src/builder.js`, drop the boot-time `await …fetchDataSources()` and pass `:data-sources-loader` (a closure over the app's register scope) to `CnAppRoot` instead of `dataSources`.
- [x] 6.3 In `src/views/BuilderHost.vue`, replace the `loadDataSources(version)` assignment with a `:data-sources-loader` built from the same register scope it derives today, so both hosts share one loader; verify no data-source request fires on app boot.

## Acceptance criteria

- A schema created after app boot (in the designer, another tab, the OpenRegister UI, or via the API) appears in the Schema dropdown the next time an editor modal is opened, with no page reload — the live-verified `Barn` case.
- Reopening an editor modal after deleting or renaming a schema shows the updated list.
- A failed data-source fetch renders a visible error with a retry control, and is never presented as "no schemas exist".
- The Register and Schema selects show a loading state while a refresh is in flight, and the last successfully loaded list stays selectable during it.
- Booting a virtual app issues zero register/schema requests for the pages editor; the requests happen only on an editor-modal open, and only for the app's own register scope.
- A consumer passing only `dataSources` behaves exactly as before; a consumer passing neither still gets free-text Register/Schema inputs.
- No existing prop, event, slot or `provide` key changed shape or was removed.

## Quality reminders (not tracked tasks)

Unit tests use `@vue/test-utils` and live under `tests/components/`. Every new prop, event, slot and provide key carries JSDoc, and the component reference docs plus the `docs/components/_generated/` partials are regenerated — `npm run check:docs` and `npm run check:jsdoc` must stay green, as must `npm test` and `npm run build`. i18n keys are English. Colors come from Nextcloud CSS variables only; no `--nldesign-*` is referenced directly. Vue 2.7 Options API only, `cn-` CSS class prefix.

This change introduces no OpenRegister schemas, so it needs no seed data. It introduces no lifecycle, aggregation, notification or widget behaviour, so ADR-031's declarative-vs-imperative guidance does not apply.
