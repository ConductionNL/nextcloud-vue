---
status: draft
---
# Manifest cardComponent on type:"index"

## Purpose

Allow a manifest-driven `type:"index"` page to delegate card-grid
row rendering to a consumer-provided component named in the
`customComponents` registry, so that consumers no longer have to
fall back to `type:"custom"` to ship a bespoke card layout.

## ADDED Requirements

### Requirement: `pages[].config.cardComponent` MUST be documented on `type:"index"` and the schema version MUST bump to 1.3.0

`src/schemas/app-manifest.schema.json` MUST update the `pages[].config`
`description` to document an optional `cardComponent: string` field on
the `type:"index"` config shape, referencing the consumer's
`customComponents` registry. The schema's top-level `version` field
MUST bump from `1.2.x` to `1.3.0`. The outer config block MUST keep
`additionalProperties: true` so the field validates without an
explicit property entry. v1.0/1.1/1.2 manifests (which do not set
`cardComponent`) MUST continue validating without changes.

#### Scenario: Manifest with cardComponent validates
- GIVEN a manifest with `pages[0]` of `type: "index"` and
  `config: { register: "client", schema: "client", cardComponent: "ClientCard" }`
- WHEN `validateManifest()` runs
- THEN it MUST return `{ valid: true, errors: [] }`

#### Scenario: v1.2 manifest still validates against v1.3 schema
- GIVEN a manifest using `type: "index"` without `cardComponent`
- WHEN `validateManifest()` runs
- THEN it MUST return `{ valid: true, errors: [] }`

### Requirement: `CnIndexPage` MUST accept a `cardComponent` prop and resolve it through the `customComponents` registry

`CnIndexPage` MUST accept a string prop `cardComponent` (default `""`).
It MUST inject `cnCustomComponents` (provided by `CnAppRoot`) with a
default empty object so the page works without `CnAppRoot`. It MUST
also accept an opt-in `customComponents` prop (object, default `null`)
that overrides the inject for unit-test wiring. Resolution MUST prefer
the explicit prop and fall back to the inject:

```js
effectiveCustomComponents = customComponents ?? cnCustomComponents ?? {}
```

When `cardComponent` is non-empty AND `effectiveCustomComponents[cardComponent]`
exists, the resolved value is the consumer card component. When
`cardComponent` is non-empty AND the name is not in the registry,
`CnIndexPage` MUST log `console.warn` and treat the resolved component
as `null` (falling back to the default `CnObjectCard`). When
`cardComponent` is empty the resolved component MUST be `null`.

#### Scenario: cardComponent prop set with matching registry entry
- GIVEN `CnIndexPage` mounted with `cardComponent="MyCard"` and
  `customComponents: { MyCard: ClientCardComponent }`
- WHEN the page enters card-grid view mode
- THEN the resolved card component MUST be `ClientCardComponent`

#### Scenario: cardComponent prop set with no matching registry entry
- GIVEN `CnIndexPage` mounted with `cardComponent="Missing"` and
  an empty `customComponents` registry
- WHEN the page enters card-grid view mode
- THEN `console.warn` MUST be called once with a message identifying
  the missing name AND the page MUST fall back to `CnObjectCard`

#### Scenario: cardComponent unset
- GIVEN `CnIndexPage` mounted without `cardComponent`
- WHEN the page enters card-grid view mode
- THEN the page MUST render `CnObjectCard` for each row, exactly as
  before this change

### Requirement: Card-grid view MUST mount the resolved component for each row, passing `{item, object, schema, register, selected}` and emitting `click` + `select`

When `resolvedCardComponent` is non-null AND the parent has not provided a `#card` scoped slot, the card-grid view MUST mount the
resolved component for each row inside the `CnCardGrid`'s `#card`
slot. The component MUST receive the props `item` (the row), `object`
(an alias for `item`), `schema` (the index page's schema), `register`
(the index page's effective register), and `selected` (boolean).
It MUST emit `click` (forwarded to the page's `row-click` event) and
`select` (forwarded to the page's `select` event).

#### Scenario: Resolved component mounted with correct props
- GIVEN `CnIndexPage` with `cardComponent="MyCard"`, schema `s`,
  `register="r"`, and `objects: [{id: 1, title: "A"}]`
- WHEN the page renders in card-grid view
- THEN the rendered `MyCard` instance MUST receive
  `item: {id:1, title:"A"}`, `object: {id:1, title:"A"}`,
  `schema: s`, `register: "r"`, `selected: false`

#### Scenario: Click on resolved component forwards row-click
- GIVEN a mounted `CnIndexPage` rendering `MyCard` instances
- WHEN `MyCard` emits `click` for the first row
- THEN `CnIndexPage` MUST emit `row-click` with the first row's
  object as the payload

### Requirement: `#card` scoped slot MUST take precedence over `cardComponent`

When the parent provides a `#card` scoped slot AND `cardComponent` is also set, the slot MUST win. This preserves existing App.vue
overrides during incremental migration.

#### Scenario: Slot wins over cardComponent
- GIVEN `CnIndexPage` with `cardComponent="MyCard"` AND a parent-
  provided `#card` slot rendering a `<TestSlotCard>`
- WHEN the page renders in card-grid view
- THEN `TestSlotCard` MUST render and `MyCard` MUST NOT render
