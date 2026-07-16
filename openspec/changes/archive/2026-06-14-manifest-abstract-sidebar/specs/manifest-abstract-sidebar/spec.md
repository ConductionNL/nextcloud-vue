manifest-abstract-sidebar
---
status: draft
---
# Manifest abstract sidebar

## Purpose

Make the right-hand sidebar fully manifest-driven on both index and
detail pages. Closes the gap where `CnIndexPage` exposed the sidebar
through slots only (unreachable from `manifest.json`) and
`CnObjectSidebar` rendered a hard-coded enum of tabs (Files, Notes,
Tags, Tasks, Audit Trail) that consumers could only extend through
`<extra-tabs>` slot wiring — not through declarative manifest config.

## ADDED Requirements

### Requirement: `CnIndexPage` MUST accept a `sidebar` prop that auto-mounts `CnIndexSidebar`

`CnIndexPage` MUST accept an optional `sidebar` prop of shape
`{ enabled: boolean, columnGroups?: array, facets?: object, showMetadata?: boolean, search?: object }`.
When `sidebar.enabled === true`, `CnIndexPage` MUST auto-mount
`CnIndexSidebar` and forward the matching props (`columnGroups` →
`columnGroups`, `facets` → `facetData`, `showMetadata` →
`showMetadata`, `search` sub-fields → matching `CnIndexSidebar`
search props). When `sidebar` is null / undefined / has
`enabled === false`, no embedded sidebar MUST be mounted (legacy
slot-driven behavior preserved).

#### Scenario: Sidebar prop unset preserves legacy behavior
- GIVEN a `CnIndexPage` mounted without the `sidebar` prop
- WHEN the component renders
- THEN no `CnIndexSidebar` instance MUST be inside the index page's DOM
- AND the existing `#header` / `#actions` / `#row-actions` / `#empty` slots MUST still work

#### Scenario: Sidebar enabled mounts CnIndexSidebar
- GIVEN a `CnIndexPage` with `sidebar={ enabled: true }`
- WHEN the component renders
- THEN exactly one `CnIndexSidebar` MUST be present inside the index page
- AND the `CnIndexSidebar.schema` prop MUST equal the page's `schema` prop

#### Scenario: Sidebar columnGroups forwarded
- GIVEN a `CnIndexPage` with `sidebar={ enabled: true, columnGroups: [{ id: 'extra', label: 'Extra', columns: [{ key: 'foo', label: 'Foo' }] }] }`
- WHEN the component renders
- THEN the embedded `CnIndexSidebar.columnGroups` prop MUST equal that array

#### Scenario: Sidebar search re-emits at the page level
- GIVEN a `CnIndexPage` with `sidebar={ enabled: true }`
- WHEN the embedded `CnIndexSidebar` emits `@search('foo')`
- THEN `CnIndexPage` MUST emit `@search('foo')`

### Requirement: `CnObjectSidebar` MUST accept a `tabs` prop opening the tab enum

`CnObjectSidebar` MUST accept an optional `tabs` prop of shape
`Array<{ id: string, label: string, icon?: string, widgets?: WidgetDef[], component?: string, order?: number }>`.
When `tabs` is set with at least one entry, `CnObjectSidebar` MUST
render that array INSTEAD of the hard-coded built-in tabs (Files,
Notes, Tags, Tasks, Audit Trail). When `tabs` is null / unset, the
component MUST render the built-in tabs as today.

#### Scenario: Tabs unset preserves built-in tabs
- GIVEN a `CnObjectSidebar` without the `tabs` prop
- WHEN the component renders
- THEN the rendered DOM MUST include `NcAppSidebarTab` instances with ids `files`, `notes`, `tags`, `tasks`, `auditTrail`
- AND the `hiddenTabs` prop MUST still filter them as today

#### Scenario: Tabs set replaces built-in tabs
- GIVEN a `CnObjectSidebar` with `tabs=[{ id: 'overview', label: 'Overview', widgets: [{ type: 'data' }] }]`
- WHEN the component renders
- THEN the rendered DOM MUST include exactly ONE `NcAppSidebarTab` with id `overview`
- AND the rendered DOM MUST NOT include `NcAppSidebarTab` instances with ids `files`, `notes`, `tags`, `tasks`, `auditTrail`

### Requirement: Widget array tabs MUST resolve `type` against the widget registry

A tab entry with a `widgets[]` array MUST resolve each
`widgets[].type` against a registry: built-in types `'data'` →
`CnObjectDataWidget`, `'metadata'` → `CnObjectMetadataWidget`. Any
other `type` value MUST resolve against the `customComponents`
registry (the prop, falling back to the injected
`cnCustomComponents`). When a widget type cannot be resolved, the
component MUST log a `console.warn` and skip that widget — the rest
of the tab MUST still render.

Each widget MUST receive shared object context as props (`objectId`,
`register`, `schema`, `apiBase` from the parent `CnObjectSidebar`)
in addition to any per-widget `props` declared on the tab entry.
Per-widget `props` MUST take precedence on conflict.

#### Scenario: Built-in data widget resolves
- GIVEN a `CnObjectSidebar` with `tabs=[{ id: 'overview', label: 'Overview', widgets: [{ type: 'data' }] }]`
- WHEN the component renders the `overview` tab
- THEN exactly one `CnObjectDataWidget` MUST appear inside that tab
- AND the widget MUST receive `objectId`, `register`, `schema`, `apiBase` props matching the parent sidebar's values

#### Scenario: Built-in metadata widget resolves
- GIVEN a `CnObjectSidebar` with `tabs=[{ id: 'meta', label: 'Meta', widgets: [{ type: 'metadata' }] }]`
- WHEN the component renders the `meta` tab
- THEN exactly one `CnObjectMetadataWidget` MUST appear inside that tab

#### Scenario: Unknown widget type warns
- GIVEN a `CnObjectSidebar` with `tabs=[{ id: 't', label: 'T', widgets: [{ type: 'nonexistent' }] }]`
- AND no `nonexistent` key in `customComponents`
- WHEN the component renders the `t` tab
- THEN a `console.warn` MUST be logged mentioning `nonexistent`
- AND the tab MUST still render (without the unresolved widget)

### Requirement: `component` tabs MUST resolve against `customComponents` registry

A tab entry with a `component` field (and no `widgets`) MUST
resolve `component` (a string) against the `customComponents`
registry — the explicit `customComponents` prop wins, falling back
to the injected `cnCustomComponents` (mirroring the
`CnPageRenderer` pattern). The resolved component MUST mount inside
the tab and MUST receive shared object context as props
(`objectId`, `register`, `schema`, `apiBase`).

When the registry name does not resolve, the component MUST log a
`console.warn` and the tab MUST render an empty placeholder (no
crash). When BOTH `widgets` and `component` are set on the same
tab entry, `component` MUST win and a `console.warn` MUST be
logged at mount time.

#### Scenario: Component registry resolves
- GIVEN a `CnObjectSidebar` with `tabs=[{ id: 'related', label: 'Related', component: 'MyRelatedTab' }]`
- AND `customComponents.MyRelatedTab` is a valid Vue component
- WHEN the component renders
- THEN `MyRelatedTab` MUST be mounted inside the `related` tab

#### Scenario: Both widgets and component → component wins
- GIVEN a tab entry with `widgets: [{ type: 'data' }]` AND `component: 'MyTab'`
- AND `MyTab` is registered
- WHEN the tab renders
- THEN `MyTab` MUST mount
- AND `CnObjectDataWidget` MUST NOT mount inside this tab
- AND a `console.warn` MUST be logged about the conflicting fields

#### Scenario: Unknown component registry name
- GIVEN a tab entry with `component: 'NotInRegistry'`
- AND the `customComponents` registry has no `NotInRegistry` entry
- WHEN the tab renders
- THEN a `console.warn` MUST be logged
- AND the tab MUST render without crashing

### Requirement: `CnDetailPage` MUST forward `sidebarProps.tabs` through `objectSidebarState`

`CnDetailPage` MUST forward `sidebarProps.tabs` (when set) through
the existing `objectSidebarState` provide/inject channel. The host
app's mounted `CnObjectSidebar` MUST receive the manifest-driven
tab array via `objectSidebarState.tabs`. When `sidebarProps.tabs`
is unset, `objectSidebarState.tabs` MUST remain `undefined` (no
leakage from prior route mounts).

#### Scenario: sidebarProps.tabs forwards through inject
- GIVEN a `CnDetailPage` with `sidebar=true`, `objectType='lead'`, `objectId='1'`, and `sidebarProps={ tabs: [{ id: 'a', label: 'A', widgets: [{ type: 'metadata' }] }] }`
- AND an `objectSidebarState` reactive object provided by the parent App
- WHEN the page mounts
- THEN `objectSidebarState.tabs` MUST equal the same array
- AND `objectSidebarState.objectType`, `objectSidebarState.objectId`, `objectSidebarState.register`, `objectSidebarState.schema` MUST also be set as today

#### Scenario: Missing sidebarProps.tabs leaves state.tabs unset
- GIVEN a `CnDetailPage` with `sidebar=true` and `sidebarProps={}` (no tabs)
- WHEN the page mounts
- THEN `objectSidebarState.tabs` MUST be `undefined`

### Requirement: The schema MUST document the new sidebar config fields

`src/schemas/app-manifest.schema.json` MUST:
- Bump the top-level `"version"` field to the next semver patch
  (`1.0.0` → `1.0.1`). The schema's canonical `$id` URL MUST NOT
  change.
- Update the description on `pages[].config` to reference the new
  `sidebar` (for `type:"index"`) and `sidebarProps.tabs` (for
  `type:"detail"`) fields.
- NOT add new `$defs` entries — those are deferred to a separate
  `manifest-config-defs` change to keep this change additive and
  minimize merge friction with the in-flight
  `manifest-page-type-extensions` change touching the same file.

#### Scenario: Schema version bump
- WHEN `src/schemas/app-manifest.schema.json` is loaded
- THEN `version` MUST equal `1.0.1` (or whatever the prior patch number was prior to this change + 1, if `manifest-page-type-extensions` landed first)

#### Scenario: pages[].config description mentions sidebar
- WHEN the schema's `$defs.page.properties.config.description` is read
- THEN the string MUST include the substring `sidebar`

### Requirement: The validator MUST enforce sidebar / tabs shape rules

`validateManifest()` in `src/utils/validateManifest.js` MUST enforce:

- For `pages[].type === 'index'` with a `config.sidebar` field
  present: `config.sidebar` MUST be a plain object. If
  `config.sidebar.enabled` is set, it MUST be a boolean. If
  `config.sidebar.columnGroups` is set, it MUST be an array. If
  `config.sidebar.facets` is set, it MUST be an object.
- For `pages[].type === 'detail'` with a
  `config.sidebarProps.tabs` field present: `tabs` MUST be an array;
  each entry MUST have a string `id` and string `label`; each entry
  MUST have either `widgets` (array) OR `component` (string), not
  both; `tabs[].id` MUST be unique within the `tabs` array.

Each violation MUST surface with a JSON-pointer-shaped error path
(e.g. `/pages/2/config/sidebarProps/tabs/0/id` for a missing tab
id at index 0 of the tabs array on page 2).

#### Scenario: Valid index sidebar config
- GIVEN a manifest with `pages[0] = { id: 'i', route: '/', type: 'index', title: 't', config: { sidebar: { enabled: true } } }`
- WHEN `validateManifest()` runs
- THEN `valid` MUST be true and `errors` MUST be empty

#### Scenario: Invalid index sidebar (non-object)
- GIVEN `config.sidebar = 'enabled'` (a string, not an object)
- WHEN `validateManifest()` runs
- THEN `errors` MUST include a string referencing `/pages/0/config/sidebar`

#### Scenario: Valid detail sidebar tabs
- GIVEN a manifest with `pages[0] = { id: 'd', route: '/x/:id', type: 'detail', title: 't', config: { sidebarProps: { tabs: [{ id: 'a', label: 'A', widgets: [] }] } } }`
- WHEN `validateManifest()` runs
- THEN `valid` MUST be true and `errors` MUST be empty

#### Scenario: Invalid detail tabs (duplicate id)
- GIVEN `tabs = [{ id: 'a', label: 'A', component: 'X' }, { id: 'a', label: 'B', component: 'Y' }]`
- WHEN `validateManifest()` runs
- THEN `errors` MUST include a message referencing duplicate id `a`

#### Scenario: Invalid detail tabs (both widgets and component)
- GIVEN a tab with `widgets: [{ type: 'data' }]` AND `component: 'X'`
- WHEN `validateManifest()` runs
- THEN `errors` MUST include a message that the entry MUST have widgets OR component, not both

### Requirement: All additions MUST be backwards compatible

Every prop, event, slot, and config field added by this change MUST be optional with a non-breaking default. A consumer using the
existing slot-based `CnIndexPage` sidebar pattern, the hard-coded
`CnObjectSidebar` tab set, or a manifest written against the
schema's previous version MUST continue working without changes.

#### Scenario: Legacy index page slot wiring still works
- GIVEN a `CnIndexPage` mounted with no `sidebar` prop and a sibling `<CnIndexSidebar>` element wired by the consumer
- WHEN the page renders
- THEN the consumer's `CnIndexSidebar` MUST render normally
- AND no embedded `CnIndexSidebar` MUST appear inside the page

#### Scenario: Legacy CnObjectSidebar slots still work
- GIVEN a `CnObjectSidebar` mounted with no `tabs` prop and a `#tab-files` slot override
- WHEN the sidebar renders
- THEN the slot content MUST replace the default Files tab content as today

#### Scenario: v1.0 manifest validates against v1.0.1 schema
- GIVEN a manifest using only the original `pages[].config` shapes (no `sidebar`, no `sidebarProps.tabs`)
- WHEN `validateManifest()` runs
- THEN `valid` MUST be true and `errors` MUST be empty
