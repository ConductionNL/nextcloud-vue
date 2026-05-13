manifest-named-view-sidebar
---
status: draft
---
# Manifest named-view sidebar

## Purpose

Express Vue Router's named-view sidebar pattern declaratively in
the manifest. Adds a `pages[].sidebarComponent` registry-name field
that swaps the host App's `#sidebar` slot content for a single page
without forcing the consumer to wire `<router-view name="sidebar">`
out-of-band. Composes with the existing `pages[].sidebar.show`
visibility gate (visibility wins).

## ADDED Requirements

### Requirement: `pages[]` MUST accept an optional `sidebarComponent` field

The manifest schema MUST allow each `pages[]` entry to declare an
optional `sidebarComponent` field of type `string`. The field
references a key in the consuming app's `customComponents`
registry (the same registry that resolves `page.component` for
`type:"custom"`, `page.headerComponent`, `page.actionsComponent`,
`page.cardComponent`, and `page.slots[*]`). When unset (the
default), the host App's `#sidebar` slot renders unchanged. When
set, `CnPageRenderer` resolves the registry name and publishes the
resolved component via the `cnPageSidebarComponent` provide
channel for `CnAppRoot` to mount.

#### Scenario: Schema admits sidebarComponent on a page entry
- GIVEN a manifest with `pages[0] = { id: 'search', route: '/search', type: 'custom', title: 'menu.search', component: 'SearchPage', sidebarComponent: 'SearchSideBar' }`
- WHEN `validateManifest()` runs
- THEN `valid` MUST be true and `errors` MUST be empty

#### Scenario: Schema rejects non-string sidebarComponent
- GIVEN a manifest with `pages[0].sidebarComponent = 42`
- WHEN `validateManifest()` runs
- THEN `errors` MUST include a string referencing `/pages/0/sidebarComponent`
- AND the error MUST mention `non-empty string`

#### Scenario: Schema rejects empty sidebarComponent
- GIVEN a manifest with `pages[0].sidebarComponent = ''`
- WHEN `validateManifest()` runs
- THEN `errors` MUST include a string referencing `/pages/0/sidebarComponent`

### Requirement: `CnPageRenderer` MUST publish a `cnPageSidebarComponent` provide channel

`CnPageRenderer` MUST publish a `cnPageSidebarComponent` provide
key whose value is a reactive holder of shape
`{ value: Component | null }`. The holder's `.value` MUST be the
result of resolving `currentPage.sidebarComponent` against the
effective `customComponents` registry (the explicit prop falls
back to the injected `cnCustomComponents`, mirroring existing
registry resolution). When the current page has no
`sidebarComponent`, `.value` MUST be `null`. When the
`sidebarComponent` name is set but not in the registry,
`CnPageRenderer` MUST log a `console.warn` mentioning the page id
and the missing registry name AND `.value` MUST be `null`.

The holder MUST update reactively when the current route (and
hence current page) changes.

#### Scenario: Resolved component flows through the holder
- GIVEN a `CnPageRenderer` mounted with `customComponents = { SearchSideBar: SomeComponent }`
- AND a manifest where the current route's page has `sidebarComponent: 'SearchSideBar'`
- WHEN the renderer mounts
- THEN `cnPageSidebarComponent.value` MUST equal `SomeComponent`

#### Scenario: Page without sidebarComponent leaves holder null
- GIVEN a `CnPageRenderer` whose current page has no `sidebarComponent` field
- WHEN the renderer mounts
- THEN `cnPageSidebarComponent.value` MUST be `null`

#### Scenario: Unknown registry name warns and falls through
- GIVEN a `CnPageRenderer` whose current page has `sidebarComponent: 'NotInRegistry'`
- AND `customComponents` has no `NotInRegistry` entry
- WHEN the renderer mounts
- THEN a `console.warn` MUST be logged mentioning `NotInRegistry`
- AND `cnPageSidebarComponent.value` MUST be `null`

#### Scenario: Holder updates on route change
- GIVEN a `CnPageRenderer` initially mounted on a page with no `sidebarComponent`
- WHEN the route changes to a page with `sidebarComponent: 'X'` (resolvable in the registry)
- THEN `cnPageSidebarComponent.value` MUST equal the resolved component for `X`

### Requirement: `CnAppRoot` MUST mount the resolved component inside the `#sidebar` slot's default content

`CnAppRoot` MUST inject `cnPageSidebarComponent` (with a default
holder of `{ value: null }` so apps without a `CnPageRenderer`
ancestor pass through unchanged). Inside the `#sidebar` slot,
`CnAppRoot` MUST render the resolved component as the slot's
DEFAULT CONTENT — i.e. the consumer's `#sidebar` slot override (if
supplied) wins; the resolved component renders only when no
override is provided.

The `cnPageSidebarVisible` gate MUST remain the outermost
condition: when `cnPageSidebarVisible.value === false`, the slot
MUST NOT render even if `cnPageSidebarComponent.value` is non-null.

#### Scenario: Resolved component renders as slot default content
- GIVEN a `CnAppRoot` mounted with no `#sidebar` slot override
- AND `cnPageSidebarComponent.value` is a Vue component `Foo`
- AND `cnPageSidebarVisible.value` is `true`
- WHEN the shell phase renders
- THEN `Foo` MUST be mounted inside the sidebar slot region

#### Scenario: Consumer slot override wins over resolved component
- GIVEN a `CnAppRoot` mounted with a `#sidebar` slot override `<MySidebar />`
- AND `cnPageSidebarComponent.value` is a Vue component `Foo`
- WHEN the shell phase renders
- THEN `MySidebar` MUST render
- AND `Foo` MUST NOT render

#### Scenario: Visibility gate suppresses the resolved component
- GIVEN a `CnAppRoot` with `cnPageSidebarVisible.value === false`
- AND `cnPageSidebarComponent.value` is a Vue component `Foo`
- WHEN the shell phase renders
- THEN nothing MUST render in the sidebar slot region (no `Foo`, no slot fallback)

#### Scenario: No sidebarComponent and no slot override leaves the slot empty
- GIVEN a `CnAppRoot` with no `#sidebar` slot override
- AND `cnPageSidebarComponent.value === null`
- WHEN the shell phase renders
- THEN no component MUST be mounted in the sidebar slot region

### Requirement: `sidebarComponent` and `sidebar.show` MUST compose deterministically

When BOTH `pages[].sidebar.show: false` AND `pages[].sidebarComponent` are set on the same page, visibility MUST win — the slot does not render at all and the resolved
component is suppressed. `CnPageRenderer` MUST log a
`console.warn` noting the dead `sidebarComponent` config so
manifest authors notice the misconfiguration. The resolved
component holder MAY still carry the resolved value (the warning
is sufficient; downstream consumers can inspect the holder
directly if needed).

#### Scenario: show=false suppresses sidebarComponent
- GIVEN a page with `sidebar: { show: false }` AND `sidebarComponent: 'X'`
- AND `customComponents.X` is registered
- WHEN the renderer mounts and `CnAppRoot` renders the shell
- THEN nothing MUST render in the sidebar slot region
- AND `cnPageSidebarVisible.value` MUST be `false`
- AND a `console.warn` MUST be logged about the dead `sidebarComponent` config

### Requirement: All additions MUST be backwards compatible

Every field, prop, provide channel, and inject added by this change MUST be optional with a non-breaking default. Manifests
that do not declare `pages[].sidebarComponent` MUST validate
unchanged. Apps that do not provide a `customComponents` registry
entry for `sidebarComponent` MUST still function — the warning
fires, the holder stays `null`, the slot falls through. Apps with
no `CnPageRenderer` ancestor (mounting page components directly)
MUST receive the inject default `{ value: null }` and behave
exactly as before this change.

#### Scenario: Manifest without sidebarComponent validates
- GIVEN a manifest with no `sidebarComponent` field on any page
- WHEN `validateManifest()` runs
- THEN `valid` MUST be true and `errors` MUST be empty

#### Scenario: Existing CnAppRoot with sibling sidebar wiring still works
- GIVEN an app that mounts `CnObjectSidebar` as a sibling of the `#sidebar` slot (current opencatalogi pattern)
- AND no `sidebarComponent` field on any page
- WHEN the shell renders
- THEN the existing sibling sidebar MUST render normally
- AND no extra component MUST appear inside the `#sidebar` slot

#### Scenario: App without CnPageRenderer ancestor injects the default holder
- GIVEN a `CnAppRoot` mounted standalone (no `CnPageRenderer` descendant)
- WHEN the inject `cnPageSidebarComponent` resolves
- THEN it MUST equal the default holder `{ value: null }`
- AND the sidebar slot MUST render the consumer's slot content (or nothing if no override)
