# Manifest settings rich sections

## Why

`manifest-page-type-extensions` shipped `CnSettingsPage` as the default
renderer for `type:"settings"` pages, but its `config.sections[]` shape
only accepts flat fields (`boolean | number | string | password | enum`).
That covers about 60% of real settings pages — the rest mix in richer
widgets like a version-info card, a register/schema mapper, an
endpoint-status panel, or a re-import button row.

Today each consumer either:

1. Falls back to `type:"custom"` and writes a hand-rolled SettingsView
   (decidesk, openregister, opencatalogi all do this), or
2. Uses `type:"settings"` but hangs everything off `#field-<key>` slot
   overrides, which are awkward for whole-section widgets.

Both options defeat the purpose of the manifest — a `type:"custom"`
settings page is no different from rolling your own router, and slot
overrides force the consumer to duplicate the section chrome.

The user's exact ask:

> "CnRegisterMapping should always be able to hold both the version
> info card and the register mapper, lets investigate what we should
> do to the design to get that to work."

(typo — they mean **`CnSettingsPage`** should host both
`CnVersionInfoCard` AND `CnRegisterMapping` from a single manifest).

## What Changes

`pages[].config.sections[]` gets two new section flavors alongside the
existing `fields[]` shape:

```jsonc
// existing — bare fields
{ "title": "i18n.general", "fields": [{ "key": "x", "type": "boolean" }] }

// NEW — registry component as the section body
{ "title": "i18n.advanced", "component": "MyAdvancedPanel", "props": { ... } }

// NEW — one or more built-in / registry widgets
{
  "title": "i18n.app-info",
  "widgets": [
    { "type": "version-info",     "props": { "appName": "Decidesk", "appVersion": "0.1.0" } },
    { "type": "register-mapping", "props": { "groups": [...] } }
  ]
}
```

Built-in widget registry inside `CnSettingsPage`:

| `widget.type`       | Component             |
|---------------------|-----------------------|
| `version-info`      | `CnVersionInfoCard`   |
| `register-mapping`  | `CnRegisterMapping`   |

Anything else falls back to the consumer-provided `customComponents`
registry (the same registry `type:"custom"` pages use).

A section MUST declare exactly one of `fields | component | widgets` —
mixing them in one section is rejected by the validator. The schema
adds a description note (no top-level `version` bump — this is purely
additive enrichment within the v1.1 surface).

## Problem

The settings-page surface is currently the worst of both worlds: it
*looks* declarative (sections of fields) but the real-world shape is
"one section of version info, one section of register/schema mappings,
two sections of toggles, one bespoke section for an ORI endpoint."
Every consuming app re-implements the cards-and-sections chrome around
those richer widgets.

`CnVersionInfoCard` and `CnRegisterMapping` already exist as
first-class library components — they're just not reachable from the
manifest. The whole point of building them as `Cn*` library components
was so apps wouldn't keep rebuilding them; the manifest layer needs
to catch up.

## Proposed Solution

Keep `fields[]` as the default (back-compat). Add two new keys at the
section level:

- `component: <registry-name>` + `props: object` — mount any
  consumer-provided component as the section body.
- `widgets: [{ type, props }, ...]` — mount one or more widgets in
  sequence; built-in widgets ship with the library (`version-info`,
  `register-mapping`) and consumer-provided ones resolve via the
  customComponents registry.

`CnSettingsPage` injects `cnCustomComponents` from the CnAppRoot tree
(same pattern CnPageRenderer uses). The lookup order for `widgets[].type`
is built-ins first, customComponents second.

The whole change is additive: every existing manifest with bare
`fields[]` continues to render unchanged; consumers opt in by adding
`component` or `widgets` to a section.

## Out of scope

- A nested-section feature ("a section inside a section"). Real apps
  use a flat list; nested settings cards is YAGNI.
- A "fields + widgets in the same section" mixed shape. The validator
  forces a single body kind per section because mixing them in CSS is
  awkward and the consumer can always split into two sections.
- Auto-registering CnVersionInfoCard / CnRegisterMapping in
  `pageTypes` as page-level types (e.g. `type:"version-info"` as a
  whole page). They're widgets, not pages — they belong inside
  Settings.
- Deprecating the per-field `#field-<key>` slot. It still works
  identically and is the right escape hatch for "one bespoke widget
  next to flat fields."

## See also

- `nextcloud-vue/openspec/changes/manifest-page-type-extensions/specs/manifest-page-type-extensions/spec.md`
  — parent change that introduced `CnSettingsPage`.
- `nextcloud-vue/src/components/CnVersionInfoCard/CnVersionInfoCard.vue`
  — the version-info widget.
- `nextcloud-vue/src/components/CnRegisterMapping/CnRegisterMapping.vue`
  — the register-mapping widget.
- decidesk's `src/views/SettingsView.vue` — the immediate consumer
  whose migration off `type:"custom"` this change unblocks.
- Companion change `manifest-detail-sidebar-config` (parallel
  worktree, modifies `CnDetailPage.vue` only) — no overlap with this
  change's surface.
