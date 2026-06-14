# Manifest config $defs

## Why

The Conduction app-manifest schema (`src/schemas/app-manifest.schema.json`)
ships only three `$defs`: `menuItem`, `menuItemLeaf`, `page`. Every
`pages[].config` block is `additionalProperties: true` — i.e. shapeless.
There is no JSON-Schema-level definition for the recurring config sub-
objects every page-type expects: `column`, `widgetDef`, `layoutItem`,
`action`, `formField`, `sidebarSection`, or `sidebarTab`.

That defeats:

- IDE autocomplete on `manifest.json` editing (no `$ref` to follow).
- Build-time / CI validation (Ajv has nothing to check `config.columns`
  or `config.widgets` against — they're just `object`).
- Cross-app consistency (every consumer guesses at field names from
  reading component source code).

Today the only validation is hand-rolled per-type rules in
`src/utils/validateManifest.js`. That's correct as a runtime safety
net, but it's the wrong *layer* for shape documentation: the schema
file should be the source of truth that editors and CI both consume.

## What Changes

Add seven new `$defs` definitions to the manifest schema:

- `column` — table-column definition (key, label, sortable, width,
  align, formatter, widget, hidden).
- `action` — row / bulk action definition (id, label, icon, permission,
  primary, confirm).
- `widgetDef` — dashboard widget definition (id, title, type, iconUrl,
  iconClass, itemApiVersions, props).
- `layoutItem` — dashboard layout entry (id, widgetId, gridX, gridY,
  gridWidth, gridHeight, showTitle).
- `formField` — schema-driven form field (key, label, type, required,
  default, enum, widget, help).
- `sidebarSection` — index sidebar config group (id, label, icon,
  fields).
- `sidebarTab` — detail sidebar tab (id, label, icon, widgets,
  component) — matches the shape `CnObjectSidebar` consumes after the
  parallel `manifest-abstract-sidebar` change opened the registry.

Each new `$def` carries a top-level `description` and per-property
`description` strings, matching the existing `menuItem` / `page`
docstring tone.

**This change is intentionally additive.** It adds the `$defs`
vocabulary but does NOT yet `$ref` them from inside `config` blocks.
The `pages[].config` property keeps `additionalProperties: true` for
now. Tightening references is the follow-up after the two parallel
schema-touching changes (`manifest-page-type-extensions`,
`manifest-abstract-sidebar`) merge.

## Problem

Without formal `$defs`, every consumer derives the shape of
`config.columns`, `config.widgets`, `config.layout`,
`config.sidebar.columnGroups`, etc. by reading component source. That
produces silent drift: opencatalogi names a column field `key` while
mydash names it `field`, both work at runtime because the components
shrug off unknown keys, and nothing flags the divergence at schema-
validation time.

The shape leakage is also a barrier to App Builder: a future admin UI
that lets users author manifests in a form needs a contract for what
`config.columns[]` looks like. Without `$defs`, the App Builder has to
hand-code that contract — duplicating component-source reading.

## Proposed Solution

Ship `$defs` for the seven recurring shapes. Schema additions go AT
THE BOTTOM of the existing `$defs` block to minimise merge surface
with the two sibling branches that touch the same file. No `$ref`s
get added from `config` blocks in this change; that's deferred to a
follow-up after the siblings merge so we don't fight cross-cutting
edits.

The `$defs` are immediately useful even without `$ref`s wired up:

- IDEs like VSCode can navigate to them by JSON-Pointer.
- Ajv consumers can validate ad-hoc shapes by passing the `$ref`
  target directly (e.g. `validate({$ref: '#/$defs/column'}, columnObj)`).
- Documentation cross-links them by anchor.

## Out of scope

- Wiring `$ref`s from `config.columns` / `config.widgets` /
  `config.layout` / `config.sidebar.*` to the new `$defs`. That's the
  follow-up `manifest-config-defs-tighten` change after the parallel
  schema changes merge.
- Recursive shape definitions (a `widget` that contains nested
  `widgets`, a `tab` that contains nested `tabs`). Defer until a
  consumer surfaces the need; the current consumers are flat.
- Bumping the schema's `version` field. Adding `$defs` without
  referencing them is non-breaking — the version stays where the
  parallel changes leave it.

## See also

- `nextcloud-vue/openspec/changes/add-json-manifest-renderer/specs/json-manifest-renderer/spec.md`
  — parent contract.
- `nextcloud-vue/openspec/changes/manifest-page-type-extensions/` —
  parallel: extends the `pages[].type` enum.
- `nextcloud-vue/openspec/changes/manifest-abstract-sidebar/` —
  parallel: opens up `CnObjectSidebar`'s tab registry; the
  `sidebarTab` `$def` mirrors the shape that change accepts.
- Hydra ADR-024 (App manifest fleet-wide adoption) — fleet-wide
  convention this `$defs` work documents.
