---
status: done
---

# Pages Editor Data Sources — Spec

**OpenSpec changes**: pages-editor-datasources-refresh ([archived 2026-07-12](../../changes/archive/2026-07-12-pages-editor-datasources-refresh/) — adds the `dataSourcesLoader` prop, a stable reactive `cnDataSourcesState` holder and a `cnRefreshDataSources()` action, so the pages editor's Register / Schema pickers refresh when a modal opens instead of showing a boot-time snapshot)

## Purpose

How the in-app pages editor discovers and refreshes the registers and schemas that feed its Register / Schema / Columns pickers.

`CnAppRoot.provide()` runs exactly once, so a `dataSources` snapshot captured at app boot can never reflect a register or schema created afterwards — the dropdown silently went stale until a full page reload. This capability defines the loader-based contract that replaces that snapshot: a stable reactive holder provided **by reference** (so the one-shot `provide()` still observes updates), an idempotent refresh action, and the loading / error surface that stops a failed fetch from masquerading as "no schemas exist".

Shipped in `@conduction/nextcloud-vue@1.0.0-beta.187`; adopted by OpenBuild.

---

## Requirements

### Requirement: CnAppRoot SHALL accept an optional `dataSourcesLoader` prop

`CnAppRoot` SHALL declare a new prop `dataSourcesLoader` of `type: Function` with `default: null`. When set it SHALL be an async function taking no arguments and resolving to a data-source object of the existing shape `{ registers: [{ value, label, schemas: [{ value, label, columns: string[] }] }] }`.

The existing `dataSources` prop (`type: Object, default: null`) SHALL remain declared and SHALL keep its current meaning: a static snapshot supplied by the consumer. Neither prop SHALL be required, and no existing prop, event, slot or `provide` key SHALL change shape or be removed.

> @e2e exclude Library-level prop/provide contract with no standalone browser surface; asserted by jest component tests under `tests/components/` and exercised end-to-end through OpenBuild's own e2e suite (ADR-008 / Playwright-UI-only convention).

#### Scenario: A consumer supplies only the static snapshot

- **GIVEN** `CnAppRoot` is mounted with `dataSources` set and no `dataSourcesLoader`
- **WHEN** the pages editor renders its Register and Schema pickers
- **THEN** the options SHALL be derived from the supplied snapshot exactly as before this change
- **AND** no loader SHALL be invoked

#### Scenario: A consumer supplies neither prop

- **GIVEN** `CnAppRoot` is mounted with neither `dataSources` nor `dataSourcesLoader`
- **WHEN** the pages editor renders its data-source fields
- **THEN** it SHALL fall back to free-text Register and Schema inputs, as before this change

### Requirement: CnAppRoot SHALL provide a stable reactive data-source holder

`CnAppRoot` SHALL provide a data-source holder to all descendants under the key `cnDataSourcesState`. The holder SHALL expose `value` (the current data-source object, or `null`), `loading` (boolean), `error` (an error/message value, or `null`) and `hasLoader` (boolean — whether a `dataSourcesLoader` is configured).

The holder's **object identity SHALL remain stable for the lifetime of the component**: refreshing SHALL mutate the holder's fields in place and SHALL NOT reassign the provided reference, so that deep descendants injecting it re-render on change. The holder SHALL be reactive Vue 2 `data` (Options API); no Composition API `ref()` SHALL be introduced into the component.

`CnAppRoot` SHALL continue to provide the existing `cnDataSources` key with its current plain-value semantics, unchanged.

> @e2e exclude Library-level provide/reactivity contract; asserted by jest component tests under `tests/components/`.

#### Scenario: A deep descendant re-renders when the holder's contents change

- **GIVEN** a descendant several levels below `CnAppRoot` injects `cnDataSourcesState` and renders its `value`
- **WHEN** `CnAppRoot` replaces the holder's `value` with a new data-source object
- **THEN** the descendant SHALL re-render with the new registers and schemas
- **AND** the injected holder reference SHALL be the same object as before

#### Scenario: The legacy provide key is untouched

- **GIVEN** an existing descendant that injects `cnDataSources`
- **WHEN** `CnAppRoot` is mounted with a `dataSources` snapshot
- **THEN** `cnDataSources` SHALL resolve to that snapshot object, exactly as before this change

### Requirement: CnAppRoot SHALL provide a `cnRefreshDataSources()` action

`CnAppRoot` SHALL provide an async action under the key `cnRefreshDataSources`. When invoked it SHALL:

1. resolve immediately as a no-op when no `dataSourcesLoader` is configured;
2. return the already-running promise when a refresh is in flight, so concurrent callers SHALL trigger at most one loader invocation;
3. set `loading` to `true`, clear `error`, and **retain the previous `value`** while the loader runs (stale-while-revalidate);
4. on success, replace the holder's `value` with the loader's result;
5. on rejection — including a loader that throws synchronously — set `error` and **retain the last successfully loaded `value`**;
6. clear `loading` in all outcomes.

> @e2e exclude Library-level action contract; asserted by jest component tests under `tests/components/`.

#### Scenario: A successful refresh replaces the data sources

- **GIVEN** `CnAppRoot` has a `dataSourcesLoader` that resolves to a register list containing a newly created schema
- **WHEN** `cnRefreshDataSources()` is invoked
- **THEN** the holder's `value` SHALL contain the new schema
- **AND** `loading` SHALL be `false` and `error` SHALL be `null` when the promise settles

#### Scenario: Concurrent refreshes are de-duplicated

- **GIVEN** a refresh is already in flight
- **WHEN** `cnRefreshDataSources()` is invoked again before it settles
- **THEN** the loader SHALL have been invoked exactly once
- **AND** both callers SHALL settle on the same result

#### Scenario: A failing loader keeps the last good list and records the error

- **GIVEN** the holder already carries a successfully loaded `value`
- **WHEN** `cnRefreshDataSources()` is invoked and the loader rejects (or throws synchronously)
- **THEN** the holder's `error` SHALL be set
- **AND** the holder's `value` SHALL still be the last successfully loaded list
- **AND** `loading` SHALL be `false`

#### Scenario: Refresh without a loader is a no-op

- **GIVEN** `CnAppRoot` is mounted without a `dataSourcesLoader`
- **WHEN** `cnRefreshDataSources()` is invoked
- **THEN** it SHALL resolve without error, `loading` SHALL stay `false`, and the holder's `value` SHALL be unchanged

### Requirement: The pages-editor modals SHALL refresh data sources when opened

`CnEditPagesModal` and `CnPageConfigModal` SHALL invoke the injected `cnRefreshDataSources()` when they are opened. Because both modals are mounted behind `v-if` by their hosts (`CnOpenBuildEditButton` and `CnPageRenderer` respectively), "opened" SHALL be implemented as the modal's `mounted()` lifecycle hook.

Row-level components (`CnPageTreeRow`) SHALL NOT trigger their own refresh — exactly one refresh SHALL be triggered per modal open, regardless of how many pages or pickers the modal renders.

> @e2e exclude Library-level lifecycle wiring; asserted by jest component tests under `tests/components/` and exercised through OpenBuild's e2e suite.

#### Scenario: A schema created after app boot appears without a reload

- **GIVEN** a virtual app was booted before a `Barn` schema was added to its register
- **WHEN** the user opens the Edit-pages modal and selects that register
- **THEN** the Schema dropdown SHALL offer `Barn` alongside the schemas that existed at boot
- **AND** no page reload SHALL be required

#### Scenario: Opening the page-config modal refreshes the list

- **WHEN** `CnPageConfigModal` is mounted with a `cnRefreshDataSources` injection available
- **THEN** `cnRefreshDataSources()` SHALL be invoked exactly once

### Requirement: The pickers SHALL prefer the live holder and fall back to the static snapshot

`CnPageTreeRow` and `CnPageConfigModal` SHALL derive their register and schema options from `cnDataSourcesState.value` when it is set, and SHALL fall back to the legacy `cnDataSources` injection when it is not. Both injections SHALL keep `{ default: null }` so the components still mount standalone.

The resolved object's shape SHALL remain `{ registers: [{ value, label, schemas: [{ value, label, columns: string[] }] }] }`; `schemaOptions` SHALL continue to select the register whose `value` matches the page's `config.register` and map that register's `schemas`.

> @e2e exclude Library-level injection-resolution contract; asserted by jest component tests under `tests/components/`.

#### Scenario: The live holder wins over the snapshot

- **GIVEN** a component is provided both a stale `cnDataSources` snapshot and a `cnDataSourcesState` holder whose `value` carries a newer register list
- **WHEN** its register and schema options are computed
- **THEN** they SHALL be derived from the holder's `value`

#### Scenario: The snapshot is used when the holder is empty

- **GIVEN** a component is provided a `cnDataSources` snapshot and a holder whose `value` is `null`
- **WHEN** its register and schema options are computed
- **THEN** they SHALL be derived from the snapshot

### Requirement: The pickers SHALL surface loading and error states

While a data-source refresh is in flight, the Register and Schema `NcSelect` controls SHALL render a loading state (via the component's own `loading` prop). When the holder carries an `error`, the editor panel SHALL render a visible error notice with a retry affordance that re-invokes `cnRefreshDataSources()`. An empty dropdown caused by a failed fetch SHALL NOT be presented as "no schemas exist".

The picker-vs-free-text gate SHALL widen so that a configured loader never causes a flash of free-text inputs: the pickers SHALL be shown when the resolved data sources contain at least one register, **or** a refresh is loading, **or** a loader is configured. With neither `dataSources` nor `dataSourcesLoader`, the free-text fallback SHALL still be shown.

All colors SHALL come from Nextcloud CSS variables; all new UI strings SHALL use English i18n keys via the library's `t('nextcloud-vue', …)` catalog.

> @e2e exclude Library-level UI-state contract rendered only inside a consumer's editor modal; asserted by jest component tests and exercised through OpenBuild's e2e suite.

#### Scenario: The selects show a loading state during a refresh

- **GIVEN** a `dataSourcesLoader` whose promise has not yet settled
- **WHEN** the Register and Schema selects render
- **THEN** they SHALL be in their loading state

#### Scenario: A failed fetch is distinguishable from an empty result

- **GIVEN** the data-source loader rejected
- **WHEN** the editor panel renders
- **THEN** an error notice SHALL be visible with a retry control
- **AND** the panel SHALL NOT present the empty dropdown as "no schemas exist"

#### Scenario: No free-text flash when a loader is configured

- **GIVEN** `CnAppRoot` is mounted with a `dataSourcesLoader` and no `dataSources` snapshot
- **WHEN** an editor modal is first opened, before the loader settles
- **THEN** the Register and Schema pickers SHALL be rendered (in their loading state)
- **AND** the free-text Register and Schema inputs SHALL NOT be rendered

### Requirement: OpenBuild SHALL pass a loader instead of prefetching at boot

Both OpenBuild hosts SHALL pass `:data-sources-loader` to `CnAppRoot` instead of building a `dataSources` snapshot during bootstrap: `src/builder.js` (which today awaits `useRegisterPicker({ appSlug }).fetchDataSources()` before mounting) and `src/views/BuilderHost.vue` (which today assigns `this.dataSources` from its own `loadDataSources(version)`). No register or schema request SHALL be issued during app boot.

The two hosts SHALL converge on a single register-scoped loader in `useRegisterPicker`. That loader SHALL fetch schemas with the register-scoped `GET /apps/openregister/api/registers/{slug}/schemas` endpoint, and SHALL be bounded to the app's own register scope — the per-app register `openbuild-{slug}`, plus registers referenced by a manifest page's `config.register`, plus any declared `Application.dataRegisters` bindings — instead of fanning schema requests out across every register on the instance. `fetchDataSources()`'s existing no-argument call shape SHALL keep working for any other caller.

> @e2e exclude Consumer-side wiring in the OpenBuild repo; asserted by OpenBuild's own unit tests and its e2e suite.

#### Scenario: App boot issues no data-source requests

- **WHEN** a virtual app boots and no editor modal is opened
- **THEN** no request to `/apps/openregister/api/registers` or `/apps/openregister/api/registers/{slug}/schemas` SHALL be made for the pages editor

#### Scenario: The loader is bounded to the app's register scope

- **GIVEN** an instance with many registers unrelated to the app
- **WHEN** the loader runs on an editor-modal open
- **THEN** it SHALL request schemas only for the app's per-app register, the registers its manifest pages reference, and its declared `dataRegisters` bindings

#### Scenario: A consumer still passing a snapshot keeps working

- **GIVEN** a consumer that passes only `dataSources` to `CnAppRoot`
- **WHEN** the pages editor is opened
- **THEN** its pickers SHALL be populated from that snapshot with no loader involved
