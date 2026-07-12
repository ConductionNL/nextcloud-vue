---
kind: code
---

## Why

The in-app pages editor's **Register / Schema dropdowns show a snapshot of the registers and schemas as they existed when the app booted**, and that snapshot is never refreshed. `CnAppRoot` receives `dataSources` as a prop and provides it to descendants as `cnDataSources` — a *plain value*, not a getter or a ref (`src/components/CnAppRoot/CnAppRoot.vue`, `provide()` ~L638, `cnDataSources: this.dataSources` ~L652). OpenBuild builds that object exactly once during app bootstrap (`src/builder.js` ~L283-285, `src/views/BuilderHost.vue` `loadDataSources()`). Any schema created after boot — in the OpenBuild designer, in another browser tab, in the OpenRegister UI, or over the API — is invisible to the editor until the user reloads the page.

This was live-verified: a `Barn` schema (id 4438, slug `barn`), correctly linked to register `openbuild-cowboy-production` (id 2466, `schemas: [4432, 4434, 4438]`), was **absent from the Schema dropdown** while `Hello Message` and `Cow` were present. Every backend path returned Barn correctly (registers list, `/registers/{id}/schemas`, and `GET /api/schemas/4438` — all HTTP 200 with a valid slug), and replaying the deployed loader logic in the live browser produced all three options. A page reload fixed it. The defect is purely the boot-time snapshot going stale.

The failure is also **silent**: every producer swallows errors into an empty list (`useRegisterPicker.fetchSchemas` `catch { return [] }`; `BuilderHost.loadDataSources` `catch { schemas = [] }`; `builder.js` try/catch → `{ registers: [] }`). A failed fetch and "this register genuinely has no schemas" are indistinguishable in the UI, and `CnPageTreeRow.selectedSchema` (~L294-298) *synthesises* a fake `{ value: slug, label: slug }` option when the stored schema is missing from the list, masking the gap entirely.

Finally, the prefetch is **pure waste for almost everyone**: every user pays the full register+schema fan-out on every app boot for a list that is only ever read inside an editor modal that most users never open.

## What Changes

- **`CnAppRoot` gains a `dataSourcesLoader` prop** (`Function`, default `null`) — an async `() => ({ registers })`. The existing `dataSources` prop is untouched; a consumer that passes only `dataSources` behaves exactly as today.
- **`CnAppRoot` provides a stable reactive data-source holder plus a `cnRefreshDataSources()` action.** Because `cnDataSources` is provided as a plain value, reassigning it would never propagate to descendants. The holder's *identity* never changes (only its contents are replaced), following the raw-ref provide precedent already used for `cnOpenBuildAvailable` / `cnEditingBody` — descendants unwrap with `.value`. The legacy `cnDataSources` key keeps being provided unchanged.
- **The editor modals refresh on open.** `CnEditPagesModal` and `CnPageConfigModal` call `cnRefreshDataSources()` when they mount, so the dropdowns always reflect the current state of OpenRegister. Both read the reactive holder first and fall back to the legacy `cnDataSources` injection, so a consumer that supplies no loader keeps the old snapshot behaviour.
- **Failures become visible.** The Register/Schema selects show a loading state while a refresh is in flight and a real error when the loader rejects, instead of collapsing to an empty dropdown that reads as "no schemas exist".
- **OpenBuild stops prefetching at boot.** Both `src/builder.js` and `src/views/BuilderHost.vue` pass `:data-sources-loader` instead of building `dataSources` during bootstrap, moving the cost from *every app boot* to *the moment an editor modal is opened*.
- **OpenBuild's two data-source producers are unified.** `useRegisterPicker.fetchDataSources()` currently fans a per-register schema request out across **every register on the instance** (`fetchRegisters()` sorts but does not filter), while `BuilderHost.loadDataSources()` scopes to the registers a page actually references. Both converge on one register-scoped loader.
- **No BREAKING changes.** New props carry defaults; no existing prop, event, slot or provide key changes shape or is removed.

### Note on the brief vs. HEAD

The originally reported "N+1 `GET /apps/openregister/api/schemas/{id}` loop in `builder.js`" **does not exist at HEAD**. `builder.js` delegates to `useRegisterPicker({ appSlug }).fetchDataSources()`, whose `fetchSchemas()` already uses the register-scoped `GET /apps/openregister/api/registers/{slug}/schemas`. The real inefficiency is different and worse in one respect: `fetchRegisters()` calls `GET /apps/openregister/api/registers` **unfiltered** (no `_limit`, no `openbuild-{slug}` prefix filter) and `fetchDataSources()` then requests schemas for *every* register returned. The unification task is therefore "narrow the register fan-out", not "replace a `/schemas/{id}` loop".

## Capabilities

### New Capabilities

- `pages-editor-data-sources`: How the in-app pages editor discovers registers and schemas — the `CnAppRoot` `dataSources` / `dataSourcesLoader` contract, the stable reactive holder and `cnRefreshDataSources()` provide keys, refresh-on-modal-open, the loading/error surface on the Register and Schema selects, and the backwards-compatible fallback to a static snapshot.

### Modified Capabilities

None. No existing spec under `openspec/specs/` covers `CnAppRoot`'s `dataSources` prop, the `cnDataSources` provide key, or the pages-editor modals (`CnEditPagesModal`, `CnPageTreeNode` / `CnPageTreeRow`, `CnPageConfigModal`). The closest capability, `cn-openbuild-edit-shell`, is still an unarchived change and its spec does not mention data sources or the pages editor at all. This change therefore establishes the first spec home for that surface.

## Impact

**Code — `@conduction/nextcloud-vue` (this repo):**
- `src/components/CnAppRoot/CnAppRoot.vue` — new `dataSourcesLoader` prop; reactive holder + `cnRefreshDataSources()` in `provide()`; loading/error state.
- `src/modals/CnEditPagesModal.vue` — refresh on open.
- `src/modals/CnPageConfigModal.vue` — refresh on open; read the holder with a legacy fallback.
- `src/components/CnPageTreeNode/CnPageTreeRow.vue` — read the holder with a legacy fallback; loading/error state on the Register/Schema selects.
- `docs/components/cn-app-root.md` and the touched components' docs, plus regenerated `docs/components/_generated/` partials; `npm run check:docs` and `npm run check:jsdoc` stay green.
- Tests under `tests/components/` (`CnAppRoot*`, `CnPageTreeRow.spec.js`, and the two modals).

**Code — OpenBuild (separate repo, `openbuild`):**
- `src/builder.js` — pass `dataSourcesLoader` instead of an awaited `dataSources`.
- `src/views/BuilderHost.vue` — pass `dataSourcesLoader` instead of assigning `this.dataSources` at load.
- `src/composables/useRegisterPicker.js` — one register-scoped loader shared by both hosts; narrowed register fan-out.

**Consumers:** All five (OpenRegister, OpenCatalogi, Procest, Pipelinq, LaunchPad) plus OpenBuild's virtual apps. The change is additive and default-off: a consumer that passes neither `dataSources` nor `dataSourcesLoader` sees free-text fields exactly as today; one that passes only `dataSources` sees the current static behaviour; only OpenBuild opts into the loader.

**Theming:** Loading and error states reuse existing Nextcloud components and CSS variables (`NcLoadingIcon`, `NcNoteCard`, `var(--color-error)` and friends). No new colors, no `--nldesign-*` usage.

**i18n:** New English UI strings for the loading and error states, registered through the library's existing `t('nextcloud-vue', …)` catalog. Keys are English per the house rule.

**Dependencies:** None added.

**Not applicable:** This change introduces no OpenRegister schemas, so it needs no seed data. It introduces no lifecycle, aggregation, notification or widget behaviour, so ADR-031's declarative-vs-imperative guidance does not apply.
