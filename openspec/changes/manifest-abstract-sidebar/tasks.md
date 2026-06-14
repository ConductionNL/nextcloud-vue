# Tasks: Manifest abstract sidebar

## Phase 1 — `CnIndexPage` sidebar

- [x] Add a `sidebar` prop to `CnIndexPage` accepting
      `{ enabled, columnGroups?, facets?, showMetadata?, search? }`. When
      `sidebar.enabled` is true, auto-mount `CnIndexSidebar` inside
      `CnIndexPage` and forward the matching props
      (`columnGroups`, `facetData`, `showMetadata`, plus the search
      sub-block fields).
- [x] Wire pass-through events: `@search`, `@columns-change`,
      `@filter-change` from the embedded `CnIndexSidebar` re-emit on
      `CnIndexPage` so consumer apps continue to handle them at the
      same level.
- [x] Keep the existing slot interface untouched. When `sidebar` is
      unset (the default), behavior matches today's `CnIndexPage`
      exactly — apps using the slot interface require zero changes.

## Phase 2 — Open-enum tabs on `CnObjectSidebar`

- [x] Add a `tabs` prop accepting
      `Array<{ id, label, icon?, widgets?, component?, order? }>`. When
      `tabs` is set with at least one entry, that array drives
      tab rendering instead of the hard-coded built-ins.
- [x] Build a small widget registry mapping `widgets[].type === 'data'`
      to `CnObjectDataWidget` and `widgets[].type === 'metadata'` to
      `CnObjectMetadataWidget`. Other `type` values resolve against the
      injected `cnCustomComponents` registry (or the new
      `customComponents` prop fallback).
- [x] Pass shared object context (`objectId`, `register`, `schema`,
      `apiBase`) to every rendered widget / component so custom tabs
      get the same context the built-in tabs receive today.
- [x] When a tab declares both `widgets` AND `component`, log a
      `console.warn` and prefer `component` (deterministic precedence
      so misconfigurations don't render two surfaces).
- [x] When `tabs` is unset (the default), preserve current behavior
      bit-for-bit: hard-coded tabs, `hiddenTabs` filtering,
      `#tab-files` / `#tab-notes` / `#tab-tags` / `#tab-tasks` /
      `#tab-audit-trail` / `#extra-tabs` slots.
- [x] Add a `customComponents` prop on `CnObjectSidebar` for
      standalone use (mirrors the prop-fallback pattern used by
      `CnPageRenderer` / `CnAppNav`); falls back to the injected
      `cnCustomComponents`.

## Phase 3 — `CnDetailPage` forwarding

- [x] Forward `sidebarProps.tabs` through the existing
      `objectSidebarState` provide/inject channel so the parent App's
      `<CnObjectSidebar>` instance picks up the manifest-driven tab
      array. No new field on `CnDetailPage` itself — `sidebarProps`
      already exists.
- [x] Update `objectSidebarState.tabs` is read by the consumer's
      mounted `CnObjectSidebar`. (The convention today: each app
      mounts `CnObjectSidebar` once at the App.vue level and reads
      `objectSidebarState.objectId` / `register` / `schema` /
      `hiddenTabs` from inject. We add `tabs` to that list.)

## Phase 4 — Schema + validator

- [x] Update `src/schemas/app-manifest.schema.json` to:
  - Bump `"version"` from `1.0.0` to `1.0.1`.
  - Update the description on `pages[].config` to mention the new
    `sidebar` (index) and `sidebarProps.tabs` (detail) fields.
  - Keep the change additive — no new `$defs` (deferred to
    `manifest-config-defs`), no enum changes (defer to
    `manifest-page-type-extensions`).
- [x] Update `src/utils/validateManifest.js` to add per-type
      sidebar validation:
  - For `type:"index"` pages with `config.sidebar`:
    `config.sidebar` MUST be an object; if `enabled` set MUST be
    boolean; if `columnGroups` set MUST be an array; if `facets` set
    MUST be an object.
  - For `type:"detail"` pages with `config.sidebarProps.tabs`:
    `tabs` MUST be an array; each entry MUST have `id` (string) and
    `label` (string); each entry MUST have `widgets` (array) OR
    `component` (string), not both; `tabs[].id` MUST be unique within
    the array.

## Phase 5 — Tests

- [x] `tests/components/CnIndexPage.spec.js` (new) — covers the
      `sidebar` prop:
  - `sidebar` unset → no embedded `CnIndexSidebar` rendered.
  - `sidebar: { enabled: true }` → `CnIndexSidebar` is mounted.
  - `sidebar: { enabled: false }` → not mounted.
  - `sidebar.columnGroups` forwarded through.
  - `@search` event from the embedded sidebar re-emits on
    `CnIndexPage`.
- [x] `tests/components/CnObjectSidebar.spec.js` (new) — covers
      the `tabs` prop:
  - `tabs` unset → built-in tabs render (Files, Notes, etc.).
  - `tabs: [...]` set → built-ins NOT rendered, custom tabs drive UI.
  - `tabs[i].widgets` with `type: 'data'` mounts `CnObjectDataWidget`.
  - `tabs[i].widgets` with `type: 'metadata'` mounts
    `CnObjectMetadataWidget`.
  - `tabs[i].component` resolves against `customComponents` registry
    and mounts.
  - Both `widgets` and `component` set → `component` wins, console
    warning emitted.
  - Unknown `widgets[].type` → console warning, tab still renders.
- [x] `tests/components/CnDetailPage.spec.js` (new) — covers the
      `sidebarProps.tabs` forwarding:
  - `sidebarProps.tabs` set → `objectSidebarState.tabs` updates with
    the same array.
  - `sidebarProps.tabs` unset → `objectSidebarState.tabs` is
    `undefined` / unset (no leakage from previous mounts).
- [x] Update `tests/utils/validateManifest.spec.js` (or whichever
      file covers the validator) with fixtures for valid + invalid
      sidebar / tabs configurations.

## Phase 6 — Documentation

- [x] Update `docs/components/cn-index-page.md`: add the `sidebar`
      prop row, a "Manifest-driven sidebar" section showing the
      object shape, and an example.
- [x] Update `docs/components/cn-object-sidebar.md`: add the `tabs`
      prop row, a "Custom tabs" section documenting the
      `{ id, label, icon?, widgets?, component? }` shape, the built-in
      widget types (`data`, `metadata`), the `customComponents`
      registry resolution, and an example.
- [x] Update `docs/components/cn-detail-page.md`: note that
      `sidebarProps.tabs` flows through to `CnObjectSidebar` via the
      existing `objectSidebarState` channel.
- [x] Update `docs/migrating-to-manifest.md` with a "Sidebar" section
      showing both the index-sidebar config and the detail-sidebar
      tabs config, end-to-end.
- [x] Run `npm run check:docs`. Must pass — every prop / event / slot
      added in this change must appear in the corresponding doc.

## Phase 7 — Spec capture

- [x] Write `specs/manifest-abstract-sidebar/spec.md` with REQ-MAS-N
      Requirements for: `CnIndexPage.sidebar` prop existence and
      behavior, `CnObjectSidebar.tabs` prop existence and behavior,
      widget registry rules, `customComponents` resolution,
      `CnDetailPage` forwarding, schema bump, validator rules,
      backwards-compat preservation.
