# Schema-Driven Detail Page Specification

## Purpose

Defines how `CnDetailPage` renders an OpenRegister object end-to-end when wired by an app manifest: header from the manifest's top-level page fields, body from the `register`+`schema`+`objectId` triple via the OR object store, and right-side `CnObjectSidebar` from the manifest's `sidebarTabs` config — all without per-app code beyond the manifest itself.

This capability is the detail-surface counterpart of the existing schema-driven contract `CnIndexPage` already implements for index pages. It covers four cooperating concerns:

1. `CnPageRenderer` forwarding the manifest's top-level page fields (`title`, `description`, `icon`) into the dispatched page component.
2. `CnDetailPage` accepting `register`+`schema`+`sidebarTabs` as first-class props and deriving the OR object-type slug internally.
3. `CnDetailPage` fetching the single object through the shared `useObjectStore` (no app-local axios, no parallel state) and exposing it as `currentObject` to descendants.
4. `CnAppRoot` auto-mounting `<CnObjectSidebar>` at `NcContent` level from the injected `objectSidebarState` — ADR-017-compliant, symmetric with the existing `cnIndexSidebarConfig` hoist.

## ADDED Requirements

### Requirement: CnPageRenderer forwards page top-level title, description, and icon to the dispatched component

`CnPageRenderer.resolvedProps` SHALL include the matching `page.title`, `page.description`, and `page.icon` fields from the manifest entry before merging `page.config` and `$route.params`. The precedence MUST be `$route.params` > `page.config` > top-level page fields, so an existing manifest that sets `config.title` (or any other shadowed field) keeps the same effective value. Forwarding MUST be additive — no existing key currently in `resolvedProps` is removed, renamed, or reordered relative to the existing two sources.

#### Scenario: Manifest detail page sets only top-level title
- GIVEN a manifest entry `{ id: "AppDetail", type: "detail", title: "Virtual app", config: { register: "openbuilt", schema: "application" } }`
- AND the route resolves with `params: { objectId: "abc-123" }`
- WHEN `CnPageRenderer` mounts the dispatched `CnDetailPage`
- THEN the child component receives `title: "Virtual app"` as a prop
- AND the child component receives `register: "openbuilt"`, `schema: "application"`, `objectId: "abc-123"` as props
- AND the rendered header h2 contains "Virtual app"

#### Scenario: config.title overrides page.title
- GIVEN a manifest entry `{ id: "AppDetail", type: "detail", title: "Top-level", config: { title: "Config-level" } }`
- WHEN `CnPageRenderer` mounts the dispatched component
- THEN the child component receives `title: "Config-level"` as a prop

#### Scenario: $route.params overrides config and top-level
- GIVEN a manifest entry `{ id: "AppDetail", type: "detail", title: "Top-level", config: { title: "Config-level" } }`
- AND the route resolves with `params: { title: "Route-level" }`
- WHEN `CnPageRenderer` mounts the dispatched component
- THEN the child component receives `title: "Route-level"` as a prop

#### Scenario: Existing index/dashboard pages keep current props
- GIVEN any existing manifest entry of `type: "index"`, `type: "dashboard"`, `type: "logs"`, or `type: "custom"`
- WHEN `CnPageRenderer` mounts the dispatched component
- THEN the child component receives `title`/`description`/`icon` as documented above
- AND every prop the child previously received from `config.*` and `$route.params` is still present at the same effective value

### Requirement: CnDetailPage accepts register, schema, and sidebarTabs as first-class props

`CnDetailPage` SHALL declare `register: String` (default `''`), `schema: String` (default `''`), and `sidebarTabs: Array` (default `() => []`) as Vue props. The component MUST derive an internal `resolvedObjectType` computed as `objectType || (register && schema ? \`${register}-${schema}\` : '')` and use that value everywhere the existing `objectType` prop is consumed (subscription, lock, sidebar state). Existing call sites passing `objectType` directly MUST keep working unchanged.

#### Scenario: Register and schema fuse into object-type slug
- GIVEN a CnDetailPage with `register="openbuilt"`, `schema="application"`, no explicit `objectType`
- WHEN the component computes `resolvedObjectType`
- THEN it returns `"openbuilt-application"`

#### Scenario: Explicit objectType still wins
- GIVEN a CnDetailPage with `objectType="legacy-slug"`, `register="openbuilt"`, `schema="application"`
- WHEN the component computes `resolvedObjectType`
- THEN it returns `"legacy-slug"`

#### Scenario: Neither register/schema nor objectType set
- GIVEN a CnDetailPage with all three of `objectType`, `register`, `schema` unset (or empty strings)
- WHEN the component computes `resolvedObjectType`
- THEN it returns `''`
- AND no fetch is attempted
- AND no `console.error` is logged

### Requirement: CnDetailPage fetches the object via useObjectStore when register, schema, and objectId are all set

When `register`, `schema`, and `objectId` are all non-empty AND no `objectStore` prop is supplied, `CnDetailPage` MUST lazy-resolve `useObjectStore()` and (a) call `objectStore.registerObjectType(resolvedObjectType, schema, register, { registerSlug: register, schemaSlug: schema })` exactly once for the resolved object-type slug, then (b) call `objectStore.fetchObject(resolvedObjectType, objectId)` on mount and on subsequent changes to `register`, `schema`, or `objectId`. Errors MUST be caught and exposed via the existing `error` state; loading MUST be exposed via the existing `loading` state. Apps that supply an explicit `objectStore` prop keep the same registration + fetch contract using their store.

#### Scenario: Mount triggers fetch
- GIVEN a CnDetailPage with `register="openbuilt"`, `schema="application"`, `objectId="abc-123"` and no `objectStore` prop
- WHEN the component mounts
- THEN `useObjectStore().registerObjectType` is called with `("openbuilt-application", "application", "openbuilt", { registerSlug: "openbuilt", schemaSlug: "application" })`
- AND `useObjectStore().fetchObject` is called with `("openbuilt-application", "abc-123")`

#### Scenario: ObjectId change triggers refetch
- GIVEN a CnDetailPage in schema-driven mode with `objectId="abc-123"`
- WHEN the parent updates `objectId` to `"def-456"`
- THEN `fetchObject` is called again with `("openbuilt-application", "def-456")`
- AND the previously displayed object's content is replaced by the new object's content once resolved

#### Scenario: Register change triggers re-registration + refetch
- GIVEN a CnDetailPage in schema-driven mode with `register="r1"`, `schema="s1"`, `objectId="abc-123"`
- WHEN the parent updates `register` to `"r2"`
- THEN `registerObjectType` is called for the new `"r2-s1"` slug
- AND `fetchObject` is called with `("r2-s1", "abc-123")`

#### Scenario: Fetch error sets error state, not throw
- GIVEN a CnDetailPage in schema-driven mode whose `fetchObject` rejects with a Response or Error
- WHEN the fetch settles
- THEN the component's `error` prop reads truthy (the caught error or `true`)
- AND the rendered DOM contains the error-state block, not the loading or empty block
- AND no unhandled promise rejection escapes the component

#### Scenario: Explicit objectStore prop is used unchanged
- GIVEN a CnDetailPage with `objectStore={customStore}`, `register="r"`, `schema="s"`, `objectId="o"`
- WHEN the component mounts
- THEN `customStore.registerObjectType` and `customStore.fetchObject` are called (NOT `useObjectStore()`)

### Requirement: CnDetailPage auto-renders data and metadata widgets when no default slot content is supplied

When `resolvedObjectType` and `objectId` are both non-empty AND the loaded object is available AND the default slot is empty, `CnDetailPage` MUST render `CnObjectDataWidget` followed by `CnObjectMetadataWidget` for the loaded object inside `.cn-detail-page__content`. Each widget MUST receive enough context (object, register, schema, objectId, objectStore) to render and save without further wiring. When the default slot has content, the auto-body MUST NOT render — the slot content takes precedence.

#### Scenario: Empty slot in schema-driven mode auto-renders widgets
- GIVEN a CnDetailPage with `register="openbuilt"`, `schema="application"`, `objectId="abc-123"`
- AND no consumer-supplied default slot content
- AND `fetchObject` has resolved successfully
- WHEN the component renders
- THEN the body contains `<CnObjectDataWidget>` followed by `<CnObjectMetadataWidget>`
- AND each widget receives `register`, `schema`, `objectId` (or the equivalent context object) as props

#### Scenario: Consumer slot wins
- GIVEN a CnDetailPage in schema-driven mode with `<MyCustomContent />` in the default slot
- WHEN the component renders
- THEN the body contains `<MyCustomContent />`
- AND the body does NOT contain the auto-rendered data + metadata widgets

#### Scenario: Schema-driven mode without loaded object yields existing loading or error state
- GIVEN a CnDetailPage in schema-driven mode whose `fetchObject` has not yet resolved
- WHEN the component renders
- THEN the body shows the loading state
- AND no auto-widgets are rendered

#### Scenario: Non-schema-driven mount leaves auto-body off
- GIVEN a CnDetailPage with no `register`+`schema`+`objectId` set, and no default slot content
- WHEN the component renders
- THEN the body is empty (current behaviour preserved)
- AND no auto-widgets are rendered

### Requirement: CnDetailPage publishes sidebarTabs into the injected objectSidebarState

The existing `syncSidebarState()` watcher SHALL also write `tabs: this.sidebarTabs`, `register: this.register`, and `schema: this.schema` onto the injected `objectSidebarState` holder alongside the existing fields (`active`, `objectType`, `objectId`, `title`, `subtitle`). When `sidebarTabs` is empty (default), the published `tabs` MUST be the empty array — downstream consumers fall back to their default tab set on that signal.

#### Scenario: Manifest sidebarTabs surface in the injected state
- GIVEN a CnDetailPage with `sidebarTabs=[{id: 'overview', label: 'Overview', widgets: [{type: 'data'}, {type: 'metadata'}]}, {id: 'manifest', label: 'Manifest', component: 'AppManifestTab'}]`
- AND mounted under a host that provides `objectSidebarState`
- WHEN the component mounts
- THEN the injected `objectSidebarState.tabs` equals the same two-tab array (by deep value)
- AND `objectSidebarState.active` is `true`
- AND `objectSidebarState.objectType` equals `resolvedObjectType`

#### Scenario: Unmount clears tabs
- GIVEN a CnDetailPage that previously published sidebarTabs into `objectSidebarState`
- WHEN the component is destroyed
- THEN `objectSidebarState.active` is `false`
- AND `objectSidebarState.tabs` is reset to `[]`

### Requirement: CnAppRoot auto-mounts CnObjectSidebar at NcContent level from objectSidebarState

`CnAppRoot` SHALL render `<CnObjectSidebar v-if="objectSidebarState.active && !$slots.sidebar" :tabs="objectSidebarState.tabs" :object-type="objectSidebarState.objectType" :object-id="objectSidebarState.objectId" :title="objectSidebarState.title" :subtitle="objectSidebarState.subtitle" />` at `NcContent` level, adjacent to the existing `cnIndexSidebarConfig` hoist. The auto-mount MUST be suppressed when the consumer supplies content for the `#sidebar` slot — consumer slot content always wins. ADR-017's prohibition on rendering `CnObjectSidebar` inside `NcAppContent` MUST be preserved.

#### Scenario: Manifest detail page mounts sidebar without per-app wiring
- GIVEN a `CnAppRoot`-hosted manifest app with no `#sidebar` slot content
- AND the active route is a `type: "detail"` page whose `CnDetailPage` published `objectSidebarState.active = true` + `tabs` array
- WHEN the page renders
- THEN the rendered DOM contains exactly one `<CnObjectSidebar>` at `NcContent` level
- AND it is NOT rendered inside `NcAppContent`

#### Scenario: Consumer #sidebar slot suppresses the auto-mount
- GIVEN a `CnAppRoot` with `<template #sidebar><CnObjectSidebar :tabs="customTabs" /></template>` supplied by the host app
- WHEN the page renders
- THEN the rendered DOM contains exactly one `<CnObjectSidebar>` (the one in the slot)
- AND the auto-mount does NOT render

#### Scenario: Inactive objectSidebarState suppresses the auto-mount
- GIVEN a `CnAppRoot` whose active page does not publish `objectSidebarState.active = true` (e.g. an index, dashboard, or custom page)
- WHEN the page renders
- THEN the rendered DOM contains NO `<CnObjectSidebar>` from the auto-mount
- AND the existing `cnIndexSidebarConfig` hoist behavior is unchanged

### Requirement: Backwards compatibility for existing CnDetailPage and CnPageRenderer call sites

Existing direct mounts of `CnDetailPage` (no manifest involved), existing apps that supply `objectStore`+`objectType`+`objectId` props directly, existing apps that pass slot content for the default slot, existing apps that render `<CnObjectSidebar>` inside their `#sidebar` slot, and existing manifest entries that already specify `config.title`/`config.description`/`config.icon` MUST all keep their current behavior. The schema-driven path is opt-in by setting `register`+`schema`+`objectId`; the title-forwarding path is opt-in by setting `page.title`/`description`/`icon` on the manifest entry (which today produces no effect on the rendered page); the auto-mount path is opt-in by NOT supplying `#sidebar` slot content.

#### Scenario: Legacy direct-mount detail page works unchanged
- GIVEN a CnDetailPage mounted with `:object-type="'foo'"` `:object-id="'42'"` `:object-store="customStore"` and slot content
- WHEN the component renders
- THEN the body shows the slot content
- AND the title and header render from existing props
- AND no schema-driven fetch is attempted

#### Scenario: Legacy manifest with config.title keeps current value
- GIVEN a manifest entry whose `config.title` was previously the only source of the rendered title
- WHEN the renderer mounts the page after this change
- THEN the rendered title equals `config.title` (config-level still wins over top-level page.title fallback per the resolution rule)
