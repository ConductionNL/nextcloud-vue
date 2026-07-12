# Design: pages-editor-datasources-refresh

## Context

The in-app pages editor (ADR-041) lets a user pick a **Register** and a **Schema** for `index` / `detail` pages instead of typing slugs. Those dropdowns are fed from a single object shaped `{ registers: [{ value, label, schemas: [{ value, label, columns: string[] }] }] }`.

**Current data flow (verified at HEAD):**

1. OpenBuild builds that object **once, at app bootstrap**:
   - `src/builder.js` (~L283-285): `let dataSources = { registers: [] }` … `dataSources = await useRegisterPicker({ appSlug: slug }).fetchDataSources()`, then passes it as the `dataSources` prop (~L327).
   - `src/views/BuilderHost.vue`: `loadDataSources(version)` derives the register set from the manifest's pages (falling back to `registerSlugForApp(...)`), fetches `GET /apps/openregister/api/registers/{register}/schemas` per register, and assigns `this.dataSources`.
2. `CnAppRoot` takes it as the `dataSources` prop (`type: Object, default: null`, ~L929) and hands it to descendants inside `provide()` (~L638) as **`cnDataSources: this.dataSources` — a plain value** (~L652). The inline comment records why it is not a getter: getter-defined provide properties "don't reliably reach deep descendants (e.g. the edit button under a page component)".
3. `CnPageTreeRow` (`inject: { cnDataSources: { default: null } }`, ~L214) and `CnPageConfigModal` (~L659-661) each derive `registerOptions` / `schemaOptions` from it. `schemaOptions()` (`CnPageTreeRow` ~L280-286, `CnPageConfigModal` ~L780-786) is byte-equivalent in both: find the register whose `value === configValue('register')`, then map its `schemas`.

**The defect.** Step 1 happens exactly once, and step 2 provides a plain value, so the picker can never see anything created after boot. A `Barn` schema created in the designer while the app was open never appeared in the Schema dropdown, even though every backend path returned it correctly; a reload fixed it.

**Two aggravating factors, both in scope:**

- **Silent failure.** Every producer collapses an error into an empty list (`useRegisterPicker.fetchSchemas`: `catch { return [] }`; `BuilderHost.loadDataSources`: `catch { schemas = [] }`; `builder.js`: whole call try/catch → `{ registers: [] }`). "The fetch failed" and "this register has no schemas" render identically. `CnPageTreeRow.selectedSchema` (~L294-298) then *synthesises* `{ value: slug, label: slug }` for a stored schema that isn't in the list, hiding the gap.
- **Wasted work.** The list is only ever read inside an editor modal. Most users never open one, yet every user pays the fetch on every app boot.

**Correction to the original brief.** There is **no** `GET /apps/openregister/api/schemas/{id}` N+1 loop in `builder.js` at HEAD — `builder.js` delegates to `useRegisterPicker({ appSlug }).fetchDataSources()`, whose `fetchSchemas()` already uses the register-scoped `GET /apps/openregister/api/registers/{slug}/schemas`. The real inefficiency is that `fetchRegisters()` calls `GET /apps/openregister/api/registers` **unfiltered** — it *sorts* to hoist `openbuild-{slug}` but never *filters* — and `fetchDataSources()` then requests schemas for **every register on the instance**. So the unification work is "narrow the register fan-out to the app's scope", not "replace a `/schemas/{id}` loop".

**Constraints.** Vue 2.7 Options API only. Never break an existing prop / event / slot / provide key. New props need defaults. Nextcloud CSS variables only. JSDoc on every prop, event and slot; `npm run check:docs` and `npm run check:jsdoc` must stay green; `docs/components/_generated/` partials regenerate.

## Goals / Non-Goals

**Goals:**

- The pages editor's Register and Schema dropdowns reflect the **current** state of OpenRegister every time an editor modal is opened, with no page reload.
- A failed data-source fetch is **visibly distinct** from "there is nothing to show".
- The register/schema fetch moves off the app-boot hot path and onto the (rare) editor-modal-open path.
- OpenBuild's two data-source producers (`builder.js` via `useRegisterPicker`, and `BuilderHost.vue`) converge on one register-scoped loader with a bounded register set.
- Strict backwards compatibility: a consumer passing only `dataSources` — or neither prop — behaves exactly as today.

**Non-Goals:**

- No live push / polling / websocket invalidation. Refresh is on modal open, not continuous.
- No caching layer or TTL beyond de-duplicating a refresh that is already in flight.
- No change to the `{ registers: [{ value, label, schemas: [{ value, label, columns }] }] }` shape — every existing consumer of `cnDataSources` keeps working against it.
- No change to how a page's `config.register` / `config.schema` are stored in the manifest.
- No new OpenRegister schemas and therefore no seed data. No lifecycle, aggregation, notification or widget behaviour, so ADR-031's declarative-vs-imperative guidance does not apply.

## Decisions

### D1 — A stable reactive holder in `data()`, provided by reference

**Decision.** `CnAppRoot` gains a `data()` member with a **stable identity**:

```js
dataSourcesState: { value: null, loading: false, error: null, hasLoader: false }
```

`provide()` returns `cnDataSourcesState: this.dataSourcesState` — the *object reference*. Refreshing **mutates fields on that object** (`this.dataSourcesState.value = next`) and never reassigns the reference. Descendants read `this.cnDataSourcesState.value`, exactly mirroring how they already unwrap the raw refs `cnOpenBuildAvailable` / `cnEditingBody` with `.value`.

**Why.** Vue 2's `provide()` runs once, so a plain value provided from a prop can never change — that *is* the bug. The three ways out:

- *A getter in `provide()`* — the file's own comment says these "don't reliably reach deep descendants (e.g. the edit button under a page component)", which is precisely where the pages editor lives. Rejected on the component's own recorded evidence.
- *A `ref()` from Vue 2.7's Composition API* — matches the raw-ref precedent literally, but CLAUDE.md forbids the Composition API in components. The existing raw refs are legal only because they come *out of composables* (`useAppStatus`, `useManifestEditor`).
- *A reactive `data()` object mutated in place* — chosen. Vue 2 deep-walks `data`, so every field is reactive; the reference is stable, so `provide()`'s one-shot capture is not a problem; and it is pure Options API. Naming the payload field `value` keeps the descendant read (`.value`) identical to the existing raw-ref convention.

`hasLoader` lives on the holder rather than being derived by descendants so that the modals and the tree rows do not each need to inject the prop.

### D2 — `cnRefreshDataSources()` is a provided action; the legacy key stays

**Decision.** `provide()` additionally returns `cnRefreshDataSources` — a bound async method on `CnAppRoot`. It:

1. returns immediately when no `dataSourcesLoader` is configured (nothing to refresh);
2. reuses the in-flight promise if a refresh is already running (de-dupe);
3. sets `loading = true`, **leaves the previous `value` in place** (stale-while-revalidate), clears `error`;
4. on success replaces `value` with the loader's result;
5. on rejection sets `error` and **keeps the last good `value`**;
6. always clears `loading`.

The loader call is wrapped so that a synchronously-throwing loader is treated identically to a rejected promise.

`cnDataSources: this.dataSources` **keeps being provided unchanged**. Nothing that injects it today breaks, and a consumer that never passes a loader is bit-for-bit unaffected.

**Resolution order in descendants** (`CnPageTreeRow`, `CnPageConfigModal`):

```
effectiveDataSources = cnDataSourcesState?.value ?? cnDataSources
```

The live holder wins when a loader is configured; the static snapshot is the fallback. Both injections keep `{ default: null }`, so the components still mount standalone in tests.

**Alternative rejected:** making `cnDataSources` itself the holder. That would change the *shape* of an existing provide key (from `{ registers }` to `{ value, loading, … }`) and break any consumer or test injecting it. Additive-only wins.

### D3 — Refresh on modal open, via `mounted()`

**Decision.** `CnEditPagesModal` and `CnPageConfigModal` call `cnRefreshDataSources()` from `mounted()`.

**Why.** Both modals are mounted behind `v-if` (`CnOpenBuildEditButton` `showPagesModal` ~L559 / `CnPageRenderer` `showConfigModal`), so *mounted == opened* and *closed == destroyed*. No watcher on a `show` prop is needed, and there is no lifetime during which a closed modal holds a stale subscription. The row components (`CnPageTreeRow`) deliberately do **not** trigger refreshes — one refresh per modal open, not one per row or per dropdown focus.

**Alternative rejected:** refreshing when the Register/Schema `NcSelect` gains focus. It would fire many times per editing session, and `NcSelect`'s body-appended dropdown makes focus events an awkward trigger.

### D4 — Surface loading and error on the pickers, and don't flash free-text

**Decision.**

- The Register and Schema `NcSelect`s bind `:loading` to the holder's `loading` flag.
- When the holder carries an `error`, the editor panel renders an inline `NcNoteCard type="error"` above the pickers with a retry affordance that re-invokes `cnRefreshDataSources()`.
- The picker-vs-free-text gate widens. Today `hasDataSources` is "the snapshot has ≥1 register" — with a loader, the holder starts empty, so on first open the panel would render **free-text inputs and then swap to dropdowns** once the fetch resolved. The gate therefore becomes:

  ```
  showPickers = hasDataSources || cnDataSourcesState.loading || cnDataSourcesState.hasLoader
  ```

  A consumer with **neither** prop still gets free-text fields, unchanged.

**Why.** The whole point of the change is that "empty" must stop being the universal answer. `NcSelect`'s own `loading` prop is the idiomatic Nextcloud affordance and needs no new CSS. `NcNoteCard` carries the error without any hardcoded colors.

### D5 — Keep `selectedSchema`'s synthesised option (accepted trade-off)

**Decision.** `selectedSchema` / `selectedRegister` keep synthesising `{ value: slug, label: slug }` when the stored slug is not in the fetched list.

**Why.** Removing it would blank a page's stored, valid `config.schema` in the UI during the loading window and whenever a fetch fails — a *worse* failure than the one being fixed, because the user could then save the page with the schema cleared. With D4 in place, the "masking" concern is addressed at the source: a stale or failed list now announces itself via the loading/error surface, so a synthesised option is no longer the only signal the user gets.

### D6 — One register-scoped loader in OpenBuild, shared by both hosts

**Decision.** `useRegisterPicker.fetchDataSources()` takes an explicit, bounded register set instead of fanning out over every register on the instance. Both hosts pass their own scope and, instead of prefetching, pass the loader down:

- `src/builder.js` — passes `:data-sources-loader` (a closure over the app slug and the manifest's referenced registers) to `CnAppRoot` in place of the awaited `dataSources`; the boot-time `await` disappears.
- `src/views/BuilderHost.vue` — passes `:data-sources-loader` built from the same scope it derives today (registers referenced by an existing page's `config.register`, falling back to `registerSlugForApp(slug, versionSlug)`), replacing the `loadDataSources(version)` assignment.

The scope is: the per-app register `openbuild-{slug}`, plus any register referenced by a manifest page's `config.register`, plus any `Application.dataRegisters` binding. Schemas are fetched with the register-scoped `GET /apps/openregister/api/registers/{slug}/schemas` that `fetchSchemas()` already uses.

**Why.** This is strictly cheaper on two axes: the fetch no longer happens at boot at all, and when it does happen it touches a handful of registers rather than every register on the instance. It also collapses two divergent producers into one code path, which is what let them drift in the first place.

**Backwards compatibility:** `fetchDataSources()`'s existing no-argument call shape must keep working for any other caller, so the bounded register set is an *optional* argument with the current behaviour as its default.

## Risks / Trade-offs

- **Descendants read the holder but a consumer passes only `dataSources`** → the resolution order in D2 (`holder.value ?? cnDataSources`) makes the snapshot the fallback, and `hasLoader` is `false`, so `showPickers` reduces to today's `hasDataSources`. Covered by a test that mounts with `dataSources` only.
- **Both modals could be open and both refresh** → the in-flight de-dupe in D2 collapses concurrent calls onto one promise, so at most one fetch is in flight.
- **A slow loader leaves the dropdowns empty-but-loading and the user picks nothing** → stale-while-revalidate (D2) keeps the last good list selectable while a refresh runs, and `:loading` tells the user why the list may still grow.
- **A loader that rejects on every open would make the editor unusable** → the previous `value` is retained and an error note with retry is shown; the user can still edit with the last known list, and with neither snapshot nor loader result the free-text fallback is still reachable.
- **`provide()` object-reference mutation is subtle** → it is the same mechanism the file already relies on for `cnFormatters` / `cnCellWidgets` (objects captured by reference at provide time). The stable-identity contract is spelled out in the JSDoc and asserted by a test that swaps the holder's contents and expects a deep descendant to re-render.
- **Moving the fetch to modal-open makes the first modal open slower than it is today** → accepted: that cost was previously paid by *every* user on *every* boot, and the modal now shows an explicit loading state instead of pretending it has an answer.
- **Cross-repo lockstep** → the nc-vue change is additive and inert until a consumer passes `dataSourcesLoader`, so nc-vue can ship first and OpenBuild can adopt it on its own schedule.

## Migration Plan

1. Ship the `@conduction/nextcloud-vue` side first. It is purely additive: without `dataSourcesLoader`, `CnAppRoot` behaves exactly as it does today. Publish to the `beta` tag.
2. OpenBuild bumps the library and switches `builder.js` + `BuilderHost.vue` from `dataSources` to `:data-sources-loader`, and narrows `useRegisterPicker.fetchDataSources()` to the bounded register set.
3. Rollback: OpenBuild reverts to passing `dataSources` (the prop is still there and still works). No data migration, no persisted state, nothing to undo.

## Open Questions

None blocking. The two judgement calls made here — keeping the synthesised `selectedSchema` option (D5), and widening the picker gate with `hasLoader` so no free-text flash occurs (D4) — are recorded above with their rationale and are cheap to revisit.
