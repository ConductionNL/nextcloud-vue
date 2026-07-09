cn-detail-body-sections
---
status: draft
---
# CnDetailPage In-Body Sections

## Purpose

Provide a declarative way for a `type:"detail"` (and, reusably, dashboard/index)
manifest page to host arbitrary REGISTERED host-app components as sections IN THE
PAGE BODY — with the object/page context injected — without forcing them into the
object sidebar and without requiring the integration-registry tab+widget parity
pair. This is the primitive that lets pipelinq's rich bespoke detail pages
(ClientDetail / ContactDetail and ~40 others embedding BRP panels, activity
timelines, comms history, relationship graphs, bookings) become declarative while
keeping those rich sections in the body.

## ADDED Requirements

### Requirement: The library MUST export `CnBodySections`

The library MUST export a `CnBodySections` Vue 2.7 SFC from
`src/components/CnBodySections/CnBodySections.vue`, re-exported from both
`src/components/index.js` and `src/index.js`. It accepts a `sections: Array`
prop (section descriptors `{ id?, component, title?, props?, placement?,
colSpan? }`), a `context: Object` prop, an optional `placement: String|null`
filter, a `grid: Boolean` (default `true`), and an `errorLabel: String`. Omitting
`sections` (default `[]`) MUST render no DOM.

#### Scenario: renders nothing when sections is empty
- GIVEN a `CnDetailPage` mounted without `bodyWidgets`
- WHEN the page renders
- THEN the rendered DOM MUST NOT contain `cn-body-sections`

### Requirement: A section MUST resolve its component from the component registry

`CnBodySections` MUST resolve each section's `component` (a string name) from the
injected v2 `cnRegistry` (any entry exposing a `.component`) first, then the
legacy `cnCustomComponents` map. A resolved component MUST be rendered as a body
section. A name present in NEITHER registry MUST render an inline error and MUST
NOT throw.

#### Scenario: resolves a v2-registry component and renders it in the body
- GIVEN a registry `{ BrpPanel: { kind: 'section', component: <C> } }`
- AND a section `{ id: 'brp', component: 'BrpPanel', title: 'BRP' }`
- WHEN `CnDetailPage` renders with that `bodyWidgets`
- THEN the resolved component `<C>` MUST be rendered inside the body sections host

#### Scenario: resolves from the legacy customComponents map
- GIVEN `cnCustomComponents = { LegacyPanel: <C> }` and no matching registry entry
- AND a section `{ component: 'LegacyPanel' }`
- WHEN the page renders
- THEN `<C>` MUST be rendered

#### Scenario: unresolved component name renders an inline error
- GIVEN a section `{ id: 'missing', component: 'NopeComponent' }` and empty registries
- WHEN the page renders
- THEN an inline error element for section `missing` MUST be present
- AND the page MUST still render

### Requirement: Section `props` MUST be token-resolved against the page context

`CnBodySections` MUST pass each `props` value through `resolveFilterValue` with
`{ objectId, object, workspace, register, schema }`, resolving `@objectId`,
`@object.<field>`, `@workspace.<key>`, and the time/user tokens. A value that
remains an `@`-token after resolution (unset optional `@workspace.<key>?`, or an
`@object.<field>` whose field is absent) MUST be dropped from the forwarded props
so the child component receives `undefined`, not a literal token string.

#### Scenario: @objectId and @object.field resolve to object values
- GIVEN the page object `{ id: 'o1', bsn: '123456789' }`
- AND a section `{ component: 'P', props: { bsn: '@object.bsn', objectId: '@objectId' } }`
- WHEN the page renders
- THEN the section component MUST receive `bsn = '123456789'` and `objectId = 'o1'`

#### Scenario: an unresolved optional token is dropped from props
- GIVEN a section `{ component: 'P', props: { maybe: '@workspace.nope?' } }` with no workspace value
- WHEN the page renders
- THEN the section component MUST receive `maybe` as `undefined`

### Requirement: The object context MUST be provided for inject-based components

`CnBodySections` MUST `provide` a reactive `cnSectionContext` holding
`{ objectId, object, register, schema }` so a section component MAY read the
object via `inject('cnSectionContext')` instead of taking explicit props.

#### Scenario: a section reads the object via inject
- GIVEN the page object `{ id: 'o1', name: 'Acme' }`
- AND a section component that injects `cnSectionContext`
- WHEN the page renders
- THEN the injected context MUST expose `objectId = 'o1'` and `object.name = 'Acme'`

### Requirement: A throwing section MUST degrade inline without breaking the page

A section component that throws while rendering MUST be caught by a per-section
error boundary and replaced with an inline error card; sibling sections and the
detail page MUST still render.

#### Scenario: one throwing section does not break siblings or the page
- GIVEN sections `[{ id: 'boom', component: 'Boom' }, { id: 'ok', component: 'Ok' }]`
  where `Boom` throws on render
- WHEN the page renders
- THEN the detail page MUST still be present
- AND the `Ok` section MUST render
- AND the `boom` section MUST show its inline error fallback

### Requirement: Sections MUST honour placement ordering

A section MUST render at the position named by its `placement` field. The
recognised placements are `before-body`, `after-data`, `after-related`, and
`end`. A section with no `placement` MUST be treated as the `end` placement. The
resulting DOM order MUST be `before-body`, then `after-data`, then
`after-related`, then `end`.

#### Scenario: sections render in placement order regardless of array order
- GIVEN sections declared in the order `end, before-body, after-related, after-data`
- WHEN the page renders
- THEN their DOM order MUST be `before-body`, `after-data`, `after-related`, `end`

#### Scenario: a section with no placement renders at the end
- GIVEN a single section `{ component: 'P' }` with no `placement`
- WHEN the page renders
- THEN it MUST render inside the `end`-placement host

### Requirement: `CnDetailPage` MUST accept a backwards-compatible `bodyWidgets` prop

`CnDetailPage` MUST add a `bodyWidgets: Array` prop defaulting to `[]`, forwarded
by `CnPageRenderer` from `config.bodyWidgets`. When empty/omitted, the page's
existing behaviour MUST be unchanged. A `bodyWidgets` section MUST NOT require a
registered sidebar tab.

#### Scenario: a body section needs no sidebar tab
- GIVEN a section `{ component: 'P' }` with no integration / sidebar registration
- WHEN the page renders
- THEN the section MUST render in the body

### Requirement: `CnAppRoot` MUST recognise the `section` registry kind

`CnAppRoot`'s registry validator MUST accept `kind: 'section'` entries with no
required metadata fields (like `kind: 'page'`), so a body-only section component
can be registered without grid metadata or integration tab+widget parity.

#### Scenario: a kind:"section" registry entry validates
- GIVEN a registry entry `{ kind: 'section', component: <C> }`
- WHEN `CnAppRoot` validates the registry
- THEN it MUST NOT throw a `RegistryKindError`
