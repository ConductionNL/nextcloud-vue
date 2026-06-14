# Manifest settings orchestration

## Why

`manifest-settings-rich-sections` got `pages[].config.sections[]` to the
point where one settings page can mix bare-fields, a single registry
component, AND a list of widgets. That's enough for a 3–4 section
admin page, but two real consumer apps still can't migrate off
`type:"custom"`:

1. **softwarecatalog**'s admin Settings page ships eight tabbed
   sub-pages (`General`, `Catalogue`, `Sync`, `Connections`,
   `Mappings`, `Notifications`, `Branding`, `Advanced`). The flat
   `sections[]` shape forces all eight tab-worth of cards onto a
   single scroll, which is unusable.
2. **procest**'s `AdminRoot` mixes `CnVersionInfoCard` with three
   bespoke admin components (`WorkflowEditor`, `CaseTypeAdmin`,
   `ParafeerRouteAdmin`). The current widget shape resolves
   `widget.type` against built-in widgets first, then falls back to
   the customComponents registry — but that fallback was an
   undocumented happy accident. If a future built-in widget is named
   `WorkflowEditor`, every consumer using the same registry name
   silently flips behavior. Manifest authors today have no
   discriminated way to say "this widget body is a custom Vue
   component, not a typo of a built-in."

Both apps therefore stay `type:"custom"`, which defeats the
manifest's purpose: one consumer-overridable, declaratively-described
page surface.

The user's exact ask in the orchestration brief:

> "Softwarecatalog's 8-tab admin Settings page and procest's
> AdminRoot stay `type:"custom"` because the lib's `CnSettingsPage`
> rich-sections shape doesn't support multi-tab orchestration — each
> section is a flat list of fields/components/widgets, no nested tab
> grouping. Lib v2 should let `sections[]` itself organize into
> tabs."

> "Also, the `widgets[]` body kind doesn't yet have a `component`
> slot for arbitrary consumer Vue components (only the built-in
> `version-info` + `register-mapping` types are supported as
> widgets); add a `component` widget type that resolves a registry
> name."

## What Changes

Two strictly additive extensions to the existing `type:"settings"`
config shape — both back-compatible. No existing test in
`CnSettingsPage.spec.js`, `CnSettingsPageRichSections.spec.js`, or
`app-manifest.schema.spec.js` MUST require modification.

### 1. `tabs[]` — Multi-tab orchestration

`pages[].config` for `type:"settings"` MAY declare `tabs: [{ id,
label, sections: [...] }]` in PLACE OF (or alongside) the flat
`sections[]`. When `tabs` is set, `CnSettingsPage` renders a tab host
(NcAppNavigationItem-style or NcAppContent tab list — whichever
ships) and routes each tab's `sections[]` through the same renderer
the flat case uses. Each section in a tab keeps the existing
`fields | component | widgets` mutual exclusion.

```jsonc
{
  "type": "settings",
  "config": {
    "tabs": [
      { "id": "general",      "label": "General",      "sections": [ /* same shape as today */ ] },
      { "id": "catalogue",    "label": "Catalogue",    "sections": [ ... ] },
      { "id": "sync",         "label": "Sync",         "sections": [ ... ] },
      { "id": "connections",  "label": "Connections",  "sections": [ ... ] },
      { "id": "mappings",     "label": "Mappings",     "sections": [ ... ] },
      { "id": "notifications","label": "Notifications","sections": [ ... ] },
      { "id": "branding",     "label": "Branding",     "sections": [ ... ] },
      { "id": "advanced",     "label": "Advanced",     "sections": [ ... ] }
    ]
  }
}
```

A page MUST declare `sections[]` OR `tabs[]` (XOR — exactly one).
Manifests with neither, or with both at top level, are rejected by
the validator.

### 2. `{ type: "component" }` widget body kind

`sections[].widgets[]` gets one new built-in widget type:
`"component"`. Unlike the existing built-ins (`version-info`,
`register-mapping`) which resolve to *fixed* lib components, the
`"component"` type is a *discriminator* that says "look up the
component by its registry name." The widget object MUST then carry a
`componentName: <registry-name>` field; `props` works as today.

```jsonc
{
  "title": "i18n.workflow",
  "widgets": [
    { "type": "component", "componentName": "WorkflowEditor", "props": { "schemaSlug": "workflow" } }
  ]
}
```

Resolution order for a `widgets[]` entry:

| `widget.type`                        | Resolves to                                   |
|--------------------------------------|-----------------------------------------------|
| `"version-info"`                     | `CnVersionInfoCard` (built-in, unchanged)     |
| `"register-mapping"`                 | `CnRegisterMapping` (built-in, unchanged)     |
| `"component"` + `componentName: <X>` | `customComponents[<X>]` (NEW, explicit)       |
| any other string                     | `customComponents[<string>]` (legacy, kept)   |

The legacy fallback is kept for back-compat but is now noted as
deprecated in JSDoc: future built-in widget names risk shadowing
consumer registry names that happen to match. The `type: "component"`
discriminator is the recommended way going forward; it makes the
manifest reader aware that the widget body is NOT a built-in.

### Out of scope

- A `tabs[]` shape that nests further `tabs[]` (sub-tabs). Real apps
  use one level; nesting is YAGNI.
- A "tabs + flat sections" shape on the same page. The validator
  forces XOR — pick one. (A consumer with one general section + tabs
  for the rest models that as a "General" tab containing the section.)
- Auto-numbered tab IDs. The manifest author MUST provide an `id`
  per tab (used as the URL hash anchor and as the active-tab key).
- A `tabs[].route` field for deep-linking each tab to its own URL
  segment. Future change; the v1 `tabs` shape only persists
  active-tab via in-page state (`#hash` is fine for the lib, but the
  consumer router still owns the page route).
- Renaming the `customComponents`-fallback resolution path for
  unknown `widget.type` strings. Removing it would break every
  existing consumer using the legacy fallback. We document it as
  deprecated; a follow-up change can flip the warning to an error
  once consumers migrate.

## Problem

Settings pages on real apps are MORE multi-tabbed than they are
multi-sectioned. Softwarecatalog's eight-tab admin is the canonical
example, but procest also benefits from tab grouping
(`General | Workflow | Case types | Mappings`). Without `tabs[]`,
both stay `type:"custom"` and the manifest layer is purely
decorative for those pages.

Separately, the `widgets[].type` resolver's "fall back to
customComponents on miss" was an undocumented escape hatch from the
rich-sections change. It works, but a manifest reader can't tell at
a glance whether `{ type: "WorkflowEditor" }` means "I expect a
built-in" or "I'm a consumer custom component." The new
`{ type: "component", componentName: "X" }` shape is self-describing
and forward-safe.

## Proposed Solution

`tabs[]` is a new optional sibling of `sections[]` at the
`type:"settings"` `config` level. When set, `CnSettingsPage` renders
a tab strip and the active tab's `sections[]` underneath; section
rendering reuses the existing `fields | component | widgets`
dispatcher unchanged. The component picks the first tab as the
default active tab; consumers can change it via the new
`initialTab: <id>` prop.

`{ type: "component", componentName: <X> }` is a new entry in the
built-in widget map. Instead of mapping to a fixed Vue component,
its resolver consults `effectiveCustomComponents[componentName]`. A
miss produces the same console.warn behavior as today's unresolved
fallback.

The validator gains:

- A top-level `pages[].config` rule for `type:"settings"`: exactly
  one of `sections | tabs` (XOR).
- A new `tabs[]` shape: each entry MUST have `id: string`, `label:
  string`, `sections: array` (same rules as the flat shape).
- A new `widget.type === "component"` rule: `componentName` MUST be
  a non-empty string when set.

The schema's `pages[].config` description gets a new sentence
documenting `tabs[]` and the `component` widget type. No top-level
schema `version` bump — purely additive.

## See also

- `nextcloud-vue/openspec/changes/manifest-settings-rich-sections/`
  — parent change that introduced `fields | component | widgets`.
- `nextcloud-vue/openspec/changes/manifest-page-type-extensions/`
  — grandparent change that introduced `CnSettingsPage`.
- `softwarecatalog/`'s existing `type:"custom"` admin Settings page
  — the eight-tab consumer this change unblocks.
- `procest/src/views/settings/AdminRoot.vue` — the immediate
  consumer migrated in Phase 4 of the orchestration brief.
