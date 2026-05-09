manifest-settings-rich-sections
---
status: draft
---
# Manifest settings rich sections

## Purpose

Extend the `pages[].config.sections[]` shape consumed by
`type: "settings"` pages so each section can declare its body in three
ways: bare `fields[]` (back-compat), a single registry-resolved
`component`, or an ordered list of `widgets[]`. Built-in widgets ship
for the two existing whole-section library widgets (`version-info` →
`CnVersionInfoCard`, `register-mapping` → `CnRegisterMapping`) so
consumer apps can compose declarative settings pages without falling
back to `type: "custom"` or `#field-<key>` slot abuse.

## ADDED Requirements

### Requirement: REQ-MSRS-1 — A settings section MUST accept exactly one of `fields | component | widgets`

Each entry in `pages[].config.sections[]` for a `type: "settings"`
page MUST declare exactly one of: a `fields: array` (back-compat,
unchanged from `manifest-page-type-extensions`), a `component: string`
naming a customComponents registry entry, or a `widgets: array` of
widget references. Sections declaring two or more of these keys MUST
be rejected by `validateManifest()`. Sections declaring none of these
keys MUST be rejected (a section with neither fields nor a body
component nor widgets has no content).

#### Scenario: Bare-fields section (back-compat)
- GIVEN `{ title: "g", fields: [{ key: "x", type: "boolean", label: "X" }] }`
- WHEN `validateManifest()` runs on a settings page containing this section
- THEN it MUST be valid

#### Scenario: Component-only section
- GIVEN `{ title: "g", component: "MyPanel", props: { foo: 1 } }`
- WHEN validated
- THEN it MUST be valid

#### Scenario: Widgets-only section with built-in widget
- GIVEN `{ title: "g", widgets: [{ type: "version-info", props: { appName: "X", appVersion: "1" } }] }`
- WHEN validated
- THEN it MUST be valid

#### Scenario: Mixed-body section is rejected
- GIVEN `{ title: "g", fields: [...], widgets: [...] }`
- WHEN validated
- THEN errors MUST include `pages[N].config.sections[K]: must declare exactly one of fields | component | widgets`

#### Scenario: Empty-body section is rejected
- GIVEN `{ title: "g" }` (no fields, no component, no widgets)
- WHEN validated
- THEN errors MUST include `pages[N].config.sections[K]: must declare exactly one of fields | component | widgets`

### Requirement: REQ-MSRS-2 — `widgets[]` entries MUST declare a `type` and resolve via built-ins first, then customComponents

Each entry in a section's `widgets[]` array MUST be an object with a
non-empty string `type`. `CnSettingsPage` MUST resolve the `type`
against the built-in widget registry (`version-info` →
`CnVersionInfoCard`, `register-mapping` → `CnRegisterMapping`) FIRST,
and against the consumer-provided `customComponents` registry SECOND.
When neither resolves, the page MUST `console.warn` and skip the
widget without throwing; the rest of the page MUST continue rendering.

#### Scenario: Built-in `version-info` resolves to CnVersionInfoCard
- GIVEN a section with `widgets: [{ type: "version-info", props: { appName: "X", appVersion: "1" } }]`
- WHEN the page mounts
- THEN the rendered DOM MUST contain a `CnVersionInfoCard` instance
- AND its `appName` prop MUST be `"X"`

#### Scenario: Built-in `register-mapping` resolves to CnRegisterMapping
- GIVEN a section with `widgets: [{ type: "register-mapping", props: { groups: [...] } }]`
- WHEN the page mounts
- THEN the rendered DOM MUST contain a `CnRegisterMapping` instance
- AND its `groups` prop MUST equal the supplied groups

#### Scenario: Unknown registry name falls back to customComponents
- GIVEN a section with `widgets: [{ type: "MyCustomPanel" }]`
- AND the consumer registers `MyCustomPanel` in customComponents
- WHEN the page mounts
- THEN `MyCustomPanel` MUST render in the section body

#### Scenario: Unknown type warns and skips
- GIVEN a section with `widgets: [{ type: "does-not-exist" }]`
- AND no entry by that name in customComponents
- WHEN the page mounts
- THEN the page MUST emit a `console.warn` mentioning the missing widget type
- AND the page MUST NOT throw
- AND other widgets / sections in the manifest MUST still render

### Requirement: REQ-MSRS-3 — `component`-style sections MUST resolve via the customComponents registry

When a section declares `component: <name>`, `CnSettingsPage` MUST
resolve `<name>` against the effective customComponents registry
(`customComponents` prop > injected `cnCustomComponents`) and mount
the resolved component as the section body, v-bind'ing `section.props`
when present.

#### Scenario: Component prop forwarding
- GIVEN a section `{ title: "g", component: "MyPanel", props: { foo: "bar" } }`
- AND `customComponents = { MyPanel: SomeComponent }`
- WHEN the page mounts
- THEN `SomeComponent` MUST render
- AND its `foo` prop MUST be `"bar"`

#### Scenario: Missing component name warns and skips
- GIVEN a section `{ title: "g", component: "Missing" }`
- AND `customComponents = {}`
- WHEN the page mounts
- THEN the page MUST emit a `console.warn`
- AND the section MUST be rendered with empty body (no throw)

### Requirement: REQ-MSRS-4 — Widget events MUST surface through `@widget-event` on `CnSettingsPage`

When a widget mounted inside a `widgets[]` section emits an event,
`CnSettingsPage` MUST re-emit it as a `@widget-event` event with
payload `{ widgetType, widgetIndex, sectionIndex, name, args }`.
Consumers wire a single page-level handler that dispatches by
`widgetType` + `name`.

#### Scenario: Built-in widget event forwarded
- GIVEN a section with `widgets: [{ type: "register-mapping", props: { groups: [...] } }]`
- WHEN the embedded `CnRegisterMapping` emits `@save` with the new mapping
- THEN `CnSettingsPage` MUST emit `@widget-event` with `{ widgetType: "register-mapping", widgetIndex: 0, sectionIndex: <K>, name: "save", args: [<mapping>] }`

### Requirement: REQ-MSRS-5 — Bare-fields settings sections MUST keep working unchanged (back-compat)

Every existing manifest with `pages[].config.sections[].fields[]` and
no `component` or `widgets` keys MUST render and validate identically
to its behaviour before this change. The new section flavors are
strictly additive; no existing test in `CnSettingsPage.spec.js` or
`app-manifest.schema.spec.js` MUST require modification.

#### Scenario: Existing flat-field settings page still validates
- GIVEN a settings page with `sections: [{ title: "g", fields: [{ key: "x", type: "boolean", label: "X" }] }]`
- WHEN `validateManifest()` runs
- THEN it MUST be valid (same result as before this change)

#### Scenario: Existing per-field `#field-<key>` slot still wins
- GIVEN a bare-fields section
- AND the consumer provides a `#field-x` scoped slot
- WHEN the page renders
- THEN the slot MUST replace the input for field `x` (same as before this change)

### Requirement: REQ-MSRS-6 — The schema description MUST document the new section shapes

`src/schemas/app-manifest.schema.json` MUST mention the three section
body kinds (`fields`, `component`, `widgets`) and the built-in widget
type list (`version-info`, `register-mapping`) in the description of
the `type: "settings"` `config` shape, so manifest authors can find
the surface without reading the validator. The schema's top-level
`version` field MUST NOT bump (still `1.1.0`); this is a description-
only enrichment of an existing surface.

#### Scenario: Description names the new keys
- GIVEN the parsed schema
- WHEN inspecting the `pages[].config` description
- THEN the description string MUST mention `component`, `widgets`, `version-info`, and `register-mapping`

#### Scenario: Schema version unchanged
- GIVEN this change has shipped
- WHEN inspecting `schema.version`
- THEN it MUST still equal `"1.1.0"`
