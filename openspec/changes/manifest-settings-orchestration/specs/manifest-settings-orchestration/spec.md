---
status: draft
---
# Manifest settings orchestration

## Purpose

Extend the `pages[].config` shape consumed by `type:"settings"`
pages so a single page can orchestrate multiple tabs. Each tab owns
its own `sections[]` array (same shape as the flat case introduced
by `manifest-settings-rich-sections`). Add an explicit
`{ type: "component", componentName: <X> }` widget shape to the
`sections[].widgets[]` body so consumer Vue components are
discriminated cleanly from built-in widget types.

## ADDED Requirements

### Requirement: REQ-MSO-1 — A settings page MUST declare exactly one of `sections` | `tabs`

`pages[].config` for `type:"settings"` MUST declare EXACTLY ONE of
`sections: array` (the existing flat shape) or `tabs: array` (the
new orchestration shape). When BOTH are set, `validateManifest()`
MUST emit
`pages[N].config: must declare exactly one of sections | tabs`.
When NEITHER is set, the existing
`pages[N].config.sections: required, must be an array` rule MUST
still fire (back-compat error message).

#### Scenario: Flat `sections[]` only (back-compat)
- GIVEN `{ type: "settings", config: { sections: [{ title: "g", fields: [...] }] } }`
- WHEN `validateManifest()` runs
- THEN it MUST be valid (same as before this change)

#### Scenario: `tabs[]` only
- GIVEN `{ type: "settings", config: { tabs: [{ id: "general", label: "General", sections: [...] }] } }`
- WHEN validated
- THEN it MUST be valid

#### Scenario: Both `sections[]` and `tabs[]` set is rejected
- GIVEN `{ type: "settings", config: { sections: [...], tabs: [...] } }`
- WHEN validated
- THEN errors MUST include `pages[N].config: must declare exactly one of sections | tabs`

#### Scenario: Neither set keeps existing `sections required` error
- GIVEN `{ type: "settings", config: {} }`
- WHEN validated
- THEN errors MUST still include the existing `pages[N].config.sections: required, must be an array` message
- AND MUST NOT additionally emit a new orchestration error

### Requirement: REQ-MSO-2 — Each tab in `tabs[]` MUST have `id`, `label`, and `sections[]`

Each entry in `pages[].config.tabs[]` MUST be a plain object with:

- `id: string` (non-empty) — addressable by `initialTab` and emitted in `@tab-change`.
- `label: string` (non-empty) — rendered as the tab button text.
- `sections: array` (non-empty) — same shape and validation rules as
  the flat `sections[]` case.

A tab MAY also carry an optional `icon: string` (MDI component name)
that the renderer prepends to the tab button.

#### Scenario: Valid minimal tab
- GIVEN a tab `{ id: "general", label: "General", sections: [{ title: "g", fields: [...] }] }`
- WHEN validated
- THEN it MUST be valid

#### Scenario: Empty `id` is rejected
- GIVEN a tab `{ id: "", label: "General", sections: [{ ... }] }`
- WHEN validated
- THEN errors MUST include `pages[N].config.tabs[K].id: required, must be a non-empty string`

#### Scenario: Empty `label` is rejected
- GIVEN a tab `{ id: "general", label: "", sections: [{ ... }] }`
- WHEN validated
- THEN errors MUST include `pages[N].config.tabs[K].label: required, must be a non-empty string`

#### Scenario: Empty `sections[]` is rejected
- GIVEN a tab `{ id: "general", label: "General", sections: [] }`
- WHEN validated
- THEN errors MUST include `pages[N].config.tabs[K].sections: must contain at least 1 section`

#### Scenario: Missing `sections` array is rejected
- GIVEN a tab `{ id: "general", label: "General" }`
- WHEN validated
- THEN errors MUST include `pages[N].config.tabs[K].sections: required, must be an array`

### Requirement: REQ-MSO-3 — Tab IDs MUST be unique within a page

When two or more tabs share the same `id`, `validateManifest()` MUST
emit a uniqueness error. The error MUST point at the duplicate (the
later index), not the first occurrence.

#### Scenario: Duplicate tab IDs rejected
- GIVEN tabs `[{ id: "a", ... }, { id: "b", ... }, { id: "a", ... }]`
- WHEN validated
- THEN errors MUST include `pages[N].config.tabs[2].id: duplicate id "a" — tab IDs must be unique within a page`

### Requirement: REQ-MSO-4 — A tab's `sections[]` MUST follow the same per-section rules as the flat shape

Within each tab's `sections[]`, every section MUST follow the
existing rules from `manifest-settings-rich-sections`
(REQ-MSRS-1 through REQ-MSRS-6): exactly one body kind among
`fields | component | widgets`, mixed-body rejection, etc. The
validator implementation MUST share the per-section validation code
between the flat `sections[]` path and the tab-nested
`tabs[].sections[]` path so future per-section rules apply uniformly.

#### Scenario: Tab with mixed-body section is rejected
- GIVEN a tab whose section sets BOTH `fields` and `widgets`
- WHEN validated
- THEN errors MUST include `pages[N].config.tabs[K].sections[J]: must declare exactly one of fields | component | widgets`

#### Scenario: Tab with bare-fields section is valid
- GIVEN a tab `{ id: "general", label: "General", sections: [{ title: "g", fields: [{ key: "x", type: "boolean", label: "X" }] }] }`
- WHEN validated
- THEN it MUST be valid

### Requirement: REQ-MSO-5 — `CnSettingsPage` MUST render a tab strip when `tabs[]` is set

When `CnSettingsPage` is mounted with a non-empty `tabs` prop, it MUST render:

- A horizontal tab strip above the section area, with one button per
  tab (labelled by `tab.label`, optionally prefixed with `tab.icon`).
- The active tab's `sections[]` MUST be rendered through the same
  section dispatcher used in the flat case.
- The first tab MUST be active by default; the optional `initialTab`
  prop overrides this when set to a known tab `id`.
- Clicking a tab button MUST switch the active tab AND emit
  `@tab-change` with payload `{ tabId, tabIndex }`.
- The tab strip MUST use Nextcloud CSS variables only — no hex
  literals or `rgba()` overrides.

#### Scenario: First tab active by default
- GIVEN `tabs: [{ id: "a", label: "A", sections: [...] }, { id: "b", label: "B", sections: [...] }]`
- WHEN the page mounts
- THEN tab "a" MUST be active
- AND tab "a"'s sections MUST be rendered

#### Scenario: `initialTab` selects a non-default tab on mount
- GIVEN `tabs: [{ id: "a", ... }, { id: "b", ... }]` and `initialTab: "b"`
- WHEN the page mounts
- THEN tab "b" MUST be active
- AND tab "b"'s sections MUST be rendered

#### Scenario: Tab click switches the active tab
- GIVEN tabs A and B are rendered, A active
- WHEN the user clicks tab B's button
- THEN tab B MUST become active
- AND tab A's sections MUST be unmounted
- AND tab B's sections MUST be mounted

#### Scenario: Tab switch emits `@tab-change`
- GIVEN tabs A and B are rendered, A active
- WHEN the user clicks tab B
- THEN `CnSettingsPage` MUST emit `@tab-change` with `{ tabId: "b", tabIndex: 1 }`

### Requirement: REQ-MSO-6 — `widgets[]` MUST accept a `{ type: "component", componentName }` discriminator

Each entry in a section's `widgets[]` array MAY use the new `type: "component"` discriminator. When set, `componentName` MUST be
a non-empty string; the renderer resolves it against the effective
customComponents registry (`customComponents` prop > injected
`cnCustomComponents`). A miss produces a `console.warn` and the
widget is skipped (same fail-soft behavior as today's resolver).

The legacy "fall back to customComponents on unknown widget.type"
resolution path MUST be kept for back-compat, but is documented in
JSDoc as deprecated; manifest authors are encouraged to migrate to
`type: "component"`.

#### Scenario: `{ type: "component", componentName: "X" }` resolves via customComponents
- GIVEN a section `{ title: "g", widgets: [{ type: "component", componentName: "MyPanel", props: { foo: 1 } }] }`
- AND `customComponents = { MyPanel: SomePanelComponent }`
- WHEN the page mounts
- THEN `SomePanelComponent` MUST render in the section body
- AND its `foo` prop MUST be `1`

#### Scenario: `type: "component"` without `componentName` is rejected
- GIVEN a widget `{ type: "component" }`
- WHEN validated
- THEN errors MUST include `pages[N].config.sections[K].widgets[W].componentName: required when type is "component", must be a non-empty string`

#### Scenario: Unknown `componentName` warns and skips
- GIVEN a widget `{ type: "component", componentName: "NotRegistered" }`
- AND `customComponents = {}`
- WHEN the page mounts
- THEN the page MUST emit a `console.warn` mentioning the missing component name
- AND the page MUST NOT throw
- AND sibling widgets in the same section MUST still render

#### Scenario: Legacy fallback path still works (back-compat)
- GIVEN a widget `{ type: "WorkflowEditor" }` (no built-in match, no `type: "component"`)
- AND `customComponents = { WorkflowEditor: WorkflowEditorComponent }`
- WHEN the page mounts
- THEN `WorkflowEditorComponent` MUST render in the section body
- AND no validation error MUST be emitted (back-compat preserved)

#### Scenario: Built-in widgets are unaffected
- GIVEN a widget `{ type: "version-info", props: { appName: "X", appVersion: "1" } }`
- WHEN the page mounts
- THEN `CnVersionInfoCard` MUST render with `appName: "X"` (built-in lookup unchanged)

### Requirement: REQ-MSO-7 — Existing flat `sections[]` and rich-sections behavior MUST keep working unchanged

Every existing manifest with `pages[].config.sections[]` (whether bare-fields, component-only, or widgets-only) MUST render and
validate identically to its behavior before this change. The
orchestration shape is strictly additive; no existing test in
`CnSettingsPage.spec.js`, `CnSettingsPageRichSections.spec.js`, or
`app-manifest.schema.spec.js` MUST require modification.

#### Scenario: Existing flat-field manifest validates
- GIVEN `{ type: "settings", config: { sections: [{ title: "g", fields: [{ key: "x", type: "boolean", label: "X" }] }] } }`
- WHEN validated
- THEN it MUST be valid

#### Scenario: Existing rich-sections manifest validates
- GIVEN `{ type: "settings", config: { sections: [{ title: "g", widgets: [{ type: "version-info", props: { appName: "X", appVersion: "1" } }] }] } }`
- WHEN validated
- THEN it MUST be valid

#### Scenario: Existing rich-sections page mounts unchanged
- GIVEN a settings page with the rich-sections shape
- WHEN the page mounts
- THEN the rendered DOM MUST match the pre-orchestration behavior
- AND no tab strip MUST be rendered

### Requirement: REQ-MSO-8 — The schema description MUST document the new shapes

`src/schemas/app-manifest.schema.json`'s `pages[].config` description MUST mention:

- That `tabs: array<{ id, label, sections }>` is an alternative to
  `sections[]` (XOR).
- The new `{ type: "component", componentName: <name> }` widget
  discriminator.

The schema's top-level `version` MUST NOT bump (still `"1.2.0"`);
this is a description-only enrichment of an existing surface.

#### Scenario: Description names the new keys
- GIVEN the parsed schema
- WHEN inspecting the `pages[].config` description
- THEN the description string MUST mention `tabs` and `componentName`

#### Scenario: Schema version unchanged
- GIVEN this change has shipped
- WHEN inspecting `schema.version`
- THEN it MUST still equal `"1.2.0"`
