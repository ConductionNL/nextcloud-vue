---
title: App manifest
sidebar_position: 2
---

# App manifest

The **app manifest** is the JSON contract that fills and configures the chassis. One file describes the app's pages, navigation, dependencies, and per-page slots; `@conduction/nextcloud-vue` reads it and mounts the right [stacked views](./app-design-principles.md#stacked-views-the-librarys-job) into the chassis automatically.

This page explains what the manifest is and how to use it. The full schema reference, migration guide, and per-section patterns live in deeper docs linked at the bottom.

## What it does

A typical Conduction Nextcloud app has 10 to 30 routes. Wiring each one as a `<router-view>` plus a `<NcAppNavigation>` entry plus a permission check plus an i18n title gets repetitive fast — and any drift between those four touchpoints means a route that loads but isn't navigable, or vice versa. The manifest collapses all four into a single declarative file:

```json
{
  "$schema": "https://nextcloud-vue.conduction.nl/schemas/app-manifest.schema.json",
  "version": "1.2",
  "id": "decidesk",
  "name": "Decidesk",
  "description": "Open-source decision management for the Nextcloud workspace.",
  "icon": "ScaleBalance",
  "menu": [
    { "id": "dashboard",  "label": "decidesk.menu.dashboard",  "icon": "ViewDashboardOutline", "order": 1 },
    { "id": "decisions",  "label": "decidesk.menu.decisions",  "icon": "ScaleBalance",         "order": 2 },
    { "id": "templates",  "label": "decidesk.menu.templates",  "icon": "FileDocumentOutline",  "order": 3, "permission": "admin" }
  ],
  "pages": [
    { "id": "dashboard",  "type": "dashboard", "config": { /* ... */ } },
    { "id": "decisions",  "type": "index",     "config": { "register": "decidesk", "schema": "decision" } },
    { "id": "templates",  "type": "settings",  "config": { /* ... */ } }
  ],
  "dependencies": ["openregister"]
}
```

[`CnAppRoot`](/docs/components/cn-app-root) reads this manifest, mounts [`CnAppNav`](/docs/components/cn-app-nav) for the left rail, and dispatches each route to the matching [`Cn*Page`](./app-design-principles.md#stacked-views-the-librarys-job) via [`CnPageRenderer`](/docs/components/cn-page-renderer). Add a route, edit the manifest. Done.

## Why JSON, not Vue

A manifest is **inspectable and remotable**: an admin tool can render the same app's structure in a settings UI; the OpenCatalogi build can ingest the manifest into a register; a future App Builder can edit it visually. None of that's possible if the navigation is buried in `<NcAppNavigation>` calls scattered across 30 hand-written `.vue` files.

JSON also means the manifest survives lib upgrades. A breaking change to `CnAppNav`'s prop shape doesn't reach into the manifest — the schema does. Apps that adopted the manifest in 1.0.0-beta.1 still work in 1.0.0 unchanged.

## Page types

Each entry in `pages[]` declares its `type` — that drives which stacked view mounts:

| `type` | Stacked view | Use it for |
|---|---|---|
| `index` | [CnIndexPage](/docs/components/cn-index-page) | Schema-driven list pages with filters, search, CRUD, mass actions |
| `detail` | [CnDetailPage](/docs/components/cn-detail-page) | Single-object views with stats, cards, audit trail, files |
| `dashboard` | [CnDashboardPage](/docs/components/cn-dashboard-page) | KPIs, charts, drag-and-drop widget grids |
| `settings` | [CnSettingsPage](/docs/components/cn-settings-page) | Admin / config forms wired to `IAppConfig` |
| `logs` | [CnLogsPage](/docs/components/cn-logs-page) | Audit-trail / activity-log views |
| `chat` | [CnChatPage](/docs/components/cn-chat-page) | NC Talk-backed conversation surfaces |
| `files` | [CnFilesPage](/docs/components/cn-files-page) | Folder browser surfaces |
| `custom` | (consumer-supplied component) | Anything that doesn't fit the above |

Each type has a known `config` shape — the `index` config takes `register` + `schema`, the `dashboard` config takes a widget array, the `settings` config takes a sections array. The manifest's `$schema` validates these at build time, so a typo surfaces with a clear error path before runtime.

## Configuring the atoms

Every page entry can optionally override the default rendering of the [five atoms](./app-design-principles.md#five-atoms-one-chassis):

- `headerComponent` / `actionsComponent` — replace the [Page header](./app-design-principles.md#five-atoms-one-chassis)'s default with a custom Vue component reference (resolved via `customComponents` registry).
- `sidebar` — turn the right [Sidebar](./app-design-principles.md#five-atoms-one-chassis) on/off, configure its tabs, point it at a different register/schema for [object context](/docs/components/cn-object-sidebar).
- `slots` — slot-by-slot overrides for the active stacked view (e.g. replace `#empty` on a [CnIndexPage](/docs/components/cn-index-page) with a tutorial onboarding panel).

The same JSON file that decides *what* pages exist also decides *what they look like*. No per-page Vue config files.

## v2 Schema

Manifest v2 introduces a set of structural improvements while keeping v1 manifests fully valid. You opt in by adding a `$schema` field pointing to the v2 schema URL.

### The `$schema` field

In v2, `$schema` is **required** at the top level:

```json
{
  "$schema": "https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json",
  "version": "2.0.0",
  "menu": [],
  "pages": []
}
```

The validator reads this field to choose the right validation path: v2 schema ends with `/app-manifest-v2.schema.json`, anything else (including absent) uses the v1 hand-rolled validator. This means v1 and v2 manifests can coexist in the same monorepo — each file declares its own version.

### Unified `widgets[]` model

In v2, `widgets[]` is a first-class array on **every** page type, not just `dashboard`. Each widget entry uses a uniform shape:

```json
{
  "widgetKey": "MyStatsWidget",
  "slot": "body",
  "gridX": 0,
  "gridY": 0,
  "gridWidth": 6,
  "gridHeight": 2,
  "props": { "title": "myapp.kpis" }
}
```

This replaces the v1 dashboard `widgetDef` + `layoutItem` pair with a single declarative record.

### Per-slot grid system

Each `widgetEntry` specifies a `slot` that determines where it is placed. The grid is 12 columns wide. The cross-field constraint `gridX + gridWidth ≤ 12` is enforced at runtime by `validateManifest()` (it cannot be expressed in JSON Schema).

#### Slot taxonomy

| Slot | Description | Grid constraint |
|------|-------------|-----------------|
| `body` | Main content area | `gridWidth` 1–12 |
| `sidebar` | Side panel | `gridWidth` **MUST be 1** |
| `header-actions` | Top-right action zone | `gridY` **MUST be 0** |
| `footer` | Bottom zone | `gridWidth` 1–12 |
| `modal` | Overlay | `gridWidth` 1–12 |
| `tab:<id>` | Named tab strip (e.g. `tab:details`) | `gridWidth` 1–12 |
| `section:<id>` | Named section (e.g. `section:addresses`) | `gridWidth` 1–12 |

The `sidebar` and `header-actions` slot constraints are enforced by the v2 JSON Schema via `allOf` + `if/then` clauses. `gridX + gridWidth ≤ 12` is documented here and enforced by the validator's post-schema arithmetic check.

### Action type discriminator

`pages[].actions[]` entries in v2 carry a `type` discriminator:

```json
{
  "id": "delete",
  "label": "app.action.delete",
  "type": "open-modal",
  "target": "confirm-delete-dialog"
}
```

| `type` | Behaviour |
|--------|-----------|
| `handler` (default) | Calls a registry function by `handler` key |
| `open-modal` | Opens a modal by `target` id |
| `open-page` | Navigates to a named route in `target` |
| `navigate` | Navigates to a URL in `target` |

When `type` is omitted, the Ajv instance (compiled with `useDefaults: true`) fills in `"handler"` for back-compatibility with v1.3.0 action declarations.

### Migration guide

A full step-by-step migration guide (v1 → v2 for existing manifests) is coming in the `manifest-v2-codemod` spec. Until then, you can migrate manually by:

1. Adding `"$schema": "…/app-manifest-v2.schema.json"` to your manifest
2. Restructuring widget placement onto the top-level `pages[].widgets[]` array using the uniform `widgetEntry` shape
3. Adding `type` discriminators to any existing `actions[]` entries (or omitting `type` to keep the default `handler` behaviour)
4. Adding `"_note"` to any `type: "custom"` pages

## Where to next

- **[Migrating to the JSON manifest](/docs/migrating-to-manifest)** — the step-by-step guide for moving an existing hand-wired app onto the manifest pattern. Read this when you're ready to adopt.
- **[App design principles](./app-design-principles.md)** — the chassis, atoms, and stacked views the manifest fills.
- **[Schemas and registers](./schemas-and-registers.md)** — the data side of the contract. Every `index` and `detail` page references a register + schema; this is where they come from.
- **[useAppManifest composable](/docs/utilities/composables/use-app-manifest)** — the runtime entry-point if you want to consume the manifest yourself rather than letting `CnAppRoot` do it.
