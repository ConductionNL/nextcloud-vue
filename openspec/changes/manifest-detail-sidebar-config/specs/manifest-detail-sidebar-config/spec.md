manifest-detail-sidebar-config
---
status: draft
---
# Manifest detail sidebar config

## Purpose

Promote `CnDetailPage.sidebar` from a Boolean to an Object whose
shape mirrors `CnIndexPage.sidebar` (consistent prop semantics
across pages), and add a single `sidebar.show` boolean (default
`true`) that lets manifest authors hide the sidebar on **index**,
**detail**, AND **custom** pages without dropping into
`type:"custom"` or wrapping the host shell.

The Boolean form on `CnDetailPage` stays supported for one
release cycle as additive deprecation (Strategy A) — a one-shot
`console.warn` fires per component instance the first time the
Boolean form is observed.

## ADDED Requirements

### Requirement: `CnDetailPage.sidebar` MUST accept both Boolean and Object forms

`CnDetailPage` MUST accept the `sidebar` prop in either form:
Boolean (legacy) or Object (preferred). The Object form's shape:

```ts
type CnDetailSidebarConfig = {
  show?: boolean         // default true; false suppresses sidebar
  enabled?: boolean      // default true; false bypasses external sidebar entirely
  register?: string      // forwards to CnObjectSidebar via objectSidebarState
  schema?: string
  hiddenTabs?: string[]
  title?: string
  subtitle?: string
  tabs?: Array<TabDef>   // see manifest-abstract-sidebar
}
```

Boolean `true` MUST normalise to `{ show: true, enabled: true }`.
Boolean `false` MUST normalise to `{ show: false, enabled: false }`.

#### Scenario: Boolean true activates external sidebar (back-compat)
- GIVEN a `CnDetailPage` with `sidebar=true`, `objectType='lead'`, `objectId='1'` and an injected `objectSidebarState`
- WHEN the page mounts
- THEN `objectSidebarState.active` MUST be `true`
- AND `objectSidebarState.objectType` MUST be `'lead'`
- AND `objectSidebarState.objectId` MUST be `'1'`

#### Scenario: Boolean false deactivates external sidebar (back-compat)
- GIVEN a `CnDetailPage` with `sidebar=false`
- WHEN the page mounts
- THEN `objectSidebarState.active` MUST be `false`

#### Scenario: Object form activates external sidebar with config
- GIVEN a `CnDetailPage` with `sidebar={ register: 'leads', schema: 'lead', tabs: [{ id: 'a', label: 'A', component: 'X' }] }`, `objectType='lead'`, `objectId='1'`
- WHEN the page mounts
- THEN `objectSidebarState.active` MUST be `true`
- AND `objectSidebarState.register` MUST be `'leads'`
- AND `objectSidebarState.schema` MUST be `'lead'`
- AND `objectSidebarState.tabs` MUST equal the same array passed in

#### Scenario: Object form fields take precedence over sidebarProps
- GIVEN a `CnDetailPage` with `sidebar={ register: 'A' }` AND `sidebarProps={ register: 'B' }`
- WHEN the page mounts
- THEN `objectSidebarState.register` MUST be `'A'`
- AND a `console.warn` MUST be logged naming the overlapping field

### Requirement: Boolean `sidebar` form MUST log a one-shot deprecation warning

When `CnDetailPage.sidebar` is observed in Boolean form, the component MUST log a `console.warn` ONCE per component instance
(not once per render) with text including `[CnDetailPage]` and
`deprecated`. Subsequent boolean toggles MUST NOT spam the
console.

#### Scenario: First observation logs warning
- GIVEN a `CnDetailPage` mounted with `sidebar=true`
- WHEN the component mounts
- THEN exactly one `console.warn` matching `/\[CnDetailPage\].*deprecated/` MUST have been called

#### Scenario: Subsequent renders do not re-warn
- GIVEN a mounted `CnDetailPage` with `sidebar=true` whose first warning fired
- WHEN the prop changes to `sidebar=false` and back to `sidebar=true`
- THEN no additional `console.warn` matching the deprecation pattern MUST fire

#### Scenario: Object form does NOT warn
- GIVEN a `CnDetailPage` with `sidebar={ show: true, register: 'r', schema: 's' }`
- WHEN the component mounts
- THEN no `console.warn` matching the deprecation pattern MUST fire

### Requirement: `sidebar.show` on Object form MUST gate the external sidebar

When `CnDetailPage.sidebar` is the Object form and `sidebar.show === false`, the component MUST NOT activate the
external sidebar via `objectSidebarState`, regardless of other
fields. `objectSidebarState.active` MUST remain `false` and
`objectSidebarState.tabs` MUST be `undefined`.

#### Scenario: show: false hides the sidebar even with full config
- GIVEN a `CnDetailPage` with `sidebar={ show: false, register: 'r', schema: 's', tabs: [{ id: 'a', label: 'A', component: 'X' }] }`, `objectType='lead'`, `objectId='1'`, and an injected `objectSidebarState`
- WHEN the page mounts
- THEN `objectSidebarState.active` MUST be `false`
- AND `objectSidebarState.tabs` MUST be `undefined`

#### Scenario: show: true (default) renders the sidebar
- GIVEN a `CnDetailPage` with `sidebar={ register: 'r', schema: 's' }` (show defaulted to true)
- WHEN the page mounts
- THEN `objectSidebarState.active` MUST be `true`

#### Scenario: enabled: false also hides the sidebar
- GIVEN a `CnDetailPage` with `sidebar={ enabled: false, register: 'r', schema: 's' }`
- WHEN the page mounts
- THEN `objectSidebarState.active` MUST be `false`

### Requirement: `CnIndexPage.sidebar.show` MUST gate embedded sidebar visibility

`CnIndexPage.sidebar` MUST accept an optional `show` field
(boolean, default `true`). When `enabled === true` AND
`show !== false`, the embedded `<CnIndexSidebar>` MUST be
rendered. When `enabled === true` AND `show === false`, the
embedded sidebar MUST NOT be rendered. When `enabled !== true`,
the embedded sidebar MUST NOT be rendered (existing behaviour
unchanged regardless of `show`).

#### Scenario: show defaults to true
- GIVEN a `CnIndexPage` with `sidebar={ enabled: true }`
- WHEN the component renders
- THEN exactly one `CnIndexSidebar` MUST be present in the DOM

#### Scenario: show: false suppresses embedded sidebar
- GIVEN a `CnIndexPage` with `sidebar={ enabled: true, show: false }`
- WHEN the component renders
- THEN NO `CnIndexSidebar` MUST be present in the DOM

#### Scenario: enabled: false short-circuits regardless of show
- GIVEN a `CnIndexPage` with `sidebar={ enabled: false, show: true }`
- WHEN the component renders
- THEN NO `CnIndexSidebar` MUST be present in the DOM

### Requirement: `CnPageRenderer` MUST expose page-level sidebar visibility via inject

`CnPageRenderer` MUST read `currentPage.sidebar?.show` (the
top-level `sidebar` field on the page entry — sibling of
`config`) and:

- Provide a reactive value under inject key `cnPageSidebarVisible`
  whose `.value` is `false` when `currentPage.sidebar?.show === false`,
  otherwise `true`.
- Apply CSS class `cn-page-renderer--no-sidebar` on the renderer
  wrapper element when the value is `false`.

The inject's default (when no `CnPageRenderer` ancestor exists)
MUST resolve to `{ value: true }` so descendant components keep
rendering the sidebar by default.

#### Scenario: Custom page with sidebar.show: false sets class + inject
- GIVEN a manifest with `pages: [{ id: 'wide', route: '/wide', type: 'custom', title: 'Wide', component: 'WidePage', sidebar: { show: false } }]`
- AND `customComponents.WidePage` is a stub component
- AND the current route name is `'wide'`
- WHEN `CnPageRenderer` mounts
- THEN the rendered wrapper element MUST have CSS class `cn-page-renderer--no-sidebar`
- AND a child inject reading `cnPageSidebarVisible` MUST receive a ref whose `.value` is `false`

#### Scenario: Page without top-level sidebar leaves class off
- GIVEN a manifest with `pages: [{ id: 'normal', route: '/n', type: 'custom', title: 'Normal', component: 'WidePage' }]` (no top-level sidebar)
- AND the current route name is `'normal'`
- WHEN `CnPageRenderer` mounts
- THEN the rendered wrapper MUST NOT have CSS class `cn-page-renderer--no-sidebar`
- AND a child inject reading `cnPageSidebarVisible` MUST receive a ref whose `.value` is `true`

#### Scenario: sidebar.show: true also keeps class off
- GIVEN `pages[0].sidebar = { show: true }`
- WHEN `CnPageRenderer` mounts that page
- THEN the wrapper MUST NOT have CSS class `cn-page-renderer--no-sidebar`

### Requirement: `CnAppRoot` MUST honour `cnPageSidebarVisible` for its `#sidebar` slot

`CnAppRoot` MUST inject `cnPageSidebarVisible` (defaulting to a
value-true ref when none is provided) and gate
`<slot name="sidebar" />` so it renders only when the inject's
`.value` is `true`.

#### Scenario: Inject false hides the sidebar slot
- GIVEN a `CnAppRoot` with manifest loaded and dependencies satisfied
- AND `cnPageSidebarVisible` provided as `{ value: false }`
- AND the consumer passes `<template #sidebar>SIDEBAR</template>`
- WHEN the shell renders
- THEN the literal text `SIDEBAR` MUST NOT appear in the DOM

#### Scenario: Inject default shows the sidebar slot
- GIVEN a `CnAppRoot` with manifest loaded
- AND no provider for `cnPageSidebarVisible`
- AND the consumer passes `<template #sidebar>SIDEBAR</template>`
- WHEN the shell renders
- THEN the literal text `SIDEBAR` MUST appear in the DOM

### Requirement: The schema MUST document the per-page `sidebar` field

`src/schemas/app-manifest.schema.json` MUST add a `sidebar`
property to `$defs.page.properties` (sibling of `config`) of
shape `{ type: 'object', additionalProperties: true, properties:
{ show: { type: 'boolean' } } }`. The property's description MUST
state that it works on every page type (including `type:"custom"`)
and that `show: false` suppresses the host App's `#sidebar` slot.

The schema's `pages[].config` description MUST mention that
`config.sidebar` is now an Object on detail pages and that
`config.sidebar.show: false` suppresses the embedded sidebar on
either index or detail pages.

The schema's top-level `version` field MUST NOT be bumped (the
additions are non-breaking under Strategy A).

#### Scenario: page schema declares sidebar property
- WHEN the schema is loaded
- THEN `$defs.page.properties.sidebar` MUST exist
- AND `$defs.page.properties.sidebar.properties.show.type` MUST equal `'boolean'`

#### Scenario: page.config description mentions the new object form
- WHEN the schema's `$defs.page.properties.config.description` is read
- THEN the string MUST contain a substring matching the literal `config.sidebar.show`

### Requirement: The validator MUST enforce the new sidebar shape rules

`validateManifest()` in `src/utils/validateManifest.js` MUST:

- Accept the per-page top-level `sidebar` field on any page type.
  When set, MUST be a plain object; `sidebar.show` MUST be a
  boolean when present. Unknown sub-fields tolerated.
- For `pages[].type === 'index'` `config.sidebar`: existing rules
  plus `show` MUST be boolean when set.
- For `pages[].type === 'detail'` `config.sidebar`: when set,
  MUST be either Boolean (legacy) OR a plain object. When an
  object, `show` and `enabled` MUST be boolean when set;
  `register`, `schema`, `title`, `subtitle` MUST be strings when
  set; `hiddenTabs` MUST be an array of strings when set; `tabs`
  follows the existing `manifest-abstract-sidebar` rules.

Each violation MUST surface with a JSON-pointer-shaped error
path (e.g. `/pages/2/sidebar/show`).

#### Scenario: Top-level sidebar accepted on index page
- GIVEN `pages[0] = { id: 'i', route: '/', type: 'index', title: 't', sidebar: { show: false } }`
- WHEN `validateManifest()` runs
- THEN `valid` MUST be `true`

#### Scenario: Top-level sidebar accepted on custom page
- GIVEN `pages[0] = { id: 'w', route: '/w', type: 'custom', title: 't', component: 'X', sidebar: { show: false } }`
- WHEN `validateManifest()` runs
- THEN `valid` MUST be `true`

#### Scenario: Non-object top-level sidebar rejected
- GIVEN `pages[0].sidebar = 'no'`
- WHEN `validateManifest()` runs
- THEN `errors` MUST contain a string matching `/pages/0/sidebar`

#### Scenario: Non-boolean sidebar.show rejected
- GIVEN `pages[0].sidebar = { show: 'maybe' }`
- WHEN `validateManifest()` runs
- THEN `errors` MUST contain a string matching `/pages/0/sidebar/show`

#### Scenario: Boolean config.sidebar accepted on detail page (legacy)
- GIVEN `pages[0] = { id: 'd', route: '/d/:id', type: 'detail', title: 't', config: { sidebar: true } }`
- WHEN `validateManifest()` runs
- THEN `valid` MUST be `true`

#### Scenario: Object config.sidebar with show:false accepted on detail page
- GIVEN `pages[0].config.sidebar = { show: false, register: 'r', schema: 's' }` on a detail page
- WHEN `validateManifest()` runs
- THEN `valid` MUST be `true`

#### Scenario: Non-boolean config.sidebar.show rejected on index page
- GIVEN `pages[0] = { id: 'i', route: '/', type: 'index', title: 't', config: { sidebar: { show: 'no' } } }`
- WHEN `validateManifest()` runs
- THEN `errors` MUST contain a string matching `/pages/0/config/sidebar/show`

### Requirement: All additions MUST be backwards compatible

Every prop, event, slot, schema field, and validator rule added by this change MUST be optional with a non-breaking default.
Specifically:

- `<CnDetailPage :sidebar="true">` and `<CnDetailPage :sidebar="false">`
  MUST continue working with no other config changes.
- `<CnIndexPage :sidebar="{ enabled: true }">` (no `show`) MUST
  render the embedded sidebar (because `show` defaults to
  `true`).
- A v1.1.0 manifest with NO `pages[].sidebar` field MUST validate
  against the post-change schema and render normally (sidebar
  visible everywhere).
- `CnAppRoot` consumers with NO `cnPageSidebarVisible` provider
  MUST render their `#sidebar` slot (default ref value `true`).

#### Scenario: Legacy boolean detail consumer still works
- GIVEN an existing `<CnDetailPage :sidebar="true" objectType="t" objectId="1">` mounted in a test
- WHEN the component mounts
- THEN `objectSidebarState.active` MUST be `true`

#### Scenario: v1.1 manifest validates against post-change schema
- GIVEN a manifest with no `pages[].sidebar` field and no Object `config.sidebar` on detail pages
- WHEN `validateManifest()` runs
- THEN `valid` MUST be `true` and `errors` MUST be empty
