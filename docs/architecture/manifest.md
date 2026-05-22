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

Each entry in `pages[]` declares its `type` — that drives which stacked view mounts. Every type composes the same [five atoms](./app-design-principles.md#five-atoms-one-chassis) — **Topbar**, **Left navigation**, **Page header**, **Main column**, **Sidebar** — but each type fills the Main column differently and decides whether the Sidebar appears at all. The atom row on each card below shows the composition: bold atoms are present by default, muted atoms are off (and can be flipped on via `sidebar` config).

<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem', margin: '1.5rem 0' }}>

<div style={{ border: '1px solid var(--ifm-color-emphasis-300)', borderRadius: '8px', padding: '1rem 1.25rem' }}>

#### `index` → [CnIndexPage](/docs/components/cn-index-page)

**Atoms:** **Topbar** · **Left nav** · **Page header** · **Main** · **Sidebar**

Schema-driven list surfaces: sortable/filterable table or card grid, pagination, mass-actions, CRUD dialogs. The Sidebar carries search + facets. Config takes `register` + `schema`; columns and filters are generated from the JSON Schema unless overridden. Use for the most common surface in any app — "show me all decisions / contacts / requests".

</div>

<div style={{ border: '1px solid var(--ifm-color-emphasis-300)', borderRadius: '8px', padding: '1rem 1.25rem' }}>

#### `detail` → [CnDetailPage](/docs/components/cn-detail-page)

**Atoms:** **Topbar** · **Left nav** · **Page header** · **Main** · **Sidebar**

Single-object views: stats panel, cards, charts, audit trail. The Sidebar carries object metadata, attached files, notes, and the activity log. Config takes `register` + `schema`; the `:id` route param identifies the object. Use for "show me *one* thing in depth".

</div>

<div style={{ border: '1px solid var(--ifm-color-emphasis-300)', borderRadius: '8px', padding: '1rem 1.25rem' }}>

#### `dashboard` → [CnDashboardPage](/docs/components/cn-dashboard-page)

**Atoms:** **Topbar** · **Left nav** · **Page header** · **Main** · _Sidebar (off)_

Drag-and-drop widget grids on a 12-column GridStack canvas: KPI tiles, charts, NC Dashboard API widgets, integration widgets. Config takes a `widgets[]` array (or v2's per-page `widgets[]` with `slot: "body"`). Use for high-level overviews and landing pages.

</div>

<div style={{ border: '1px solid var(--ifm-color-emphasis-300)', borderRadius: '8px', padding: '1rem 1.25rem' }}>

#### `settings` → [CnSettingsPage](/docs/components/cn-settings-page)

**Atoms:** **Topbar** · **Left nav** · **Page header** · **Main** · _Sidebar (off)_

Sectioned admin / config forms wired to `IAppConfig`. Config takes a `sections[]` array of cards; in v2 these flatten into `slot: "section:<id>"` widget entries. Use for app-level configuration surfaces — connection settings, defaults, feature toggles.

</div>

<div style={{ border: '1px solid var(--ifm-color-emphasis-300)', borderRadius: '8px', padding: '1rem 1.25rem' }}>

#### `logs` → [CnLogsPage](/docs/components/cn-logs-page)

**Atoms:** **Topbar** · **Left nav** · **Page header** · **Main** · **Sidebar**

Audit-trail / activity-log views: streaming timeline in Main, filter facets (actor, action, date range) in the Sidebar. Config takes `source` (register, schema, or external endpoint) and an optional `columns[]` override. Use for compliance and observability surfaces.

</div>

<div style={{ border: '1px solid var(--ifm-color-emphasis-300)', borderRadius: '8px', padding: '1rem 1.25rem' }}>

#### `chat` → [CnChatPage](/docs/components/cn-chat-page)

**Atoms:** **Topbar** · **Left nav** · **Page header** · **Main** · **Sidebar**

NC Talk-backed conversation surfaces: message thread in Main, room list + participants in the Sidebar. Config takes a Talk `token` (room id) or a route-derived selector. Use for in-app chat features that ride on the workspace's existing Talk install.

</div>

<div style={{ border: '1px solid var(--ifm-color-emphasis-300)', borderRadius: '8px', padding: '1rem 1.25rem' }}>

#### `files` → [CnFilesPage](/docs/components/cn-files-page)

**Atoms:** **Topbar** · **Left nav** · **Page header** · **Main** · **Sidebar**

Folder-browser surfaces: file list in Main, folder tree + preview pane in the Sidebar. Config takes a `root` path inside the user's Nextcloud files. Use for app-scoped document surfaces ("attachments for this register") rather than a full Files replacement.

</div>

<div style={{ border: '1px solid var(--ifm-color-emphasis-300)', borderRadius: '8px', padding: '1rem 1.25rem' }}>

#### `custom` → consumer-supplied component

**Atoms:** **Topbar** · **Left nav** · _Page header (optional)_ · **Main** · _Sidebar (optional)_

Escape hatch for anything the typed views don't cover. Config carries a `component` key resolved against `customComponents`; the component owns its Main column. Page header and Sidebar are opt-in via `headerComponent` / `sidebar` overrides. Use sparingly — every bespoke page is one the chassis can't enforce consistency on.

</div>

</div>

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

The `manifest-migrate` CLI codemod automates the mechanical parts of the v1 → v2 migration. See **[Migrating to v2](../migrating-to-v2.md)** for the full guide.

Quick start:

```bash
npx @conduction/nextcloud-vue manifest-migrate \
  --input src/manifest.json \
  --report MIGRATION_REPORT.md
```

What the codemod handles automatically:

1. Sets `"$schema"` to the v2 canonical URL
2. Merges `config.widgets[]` + `config.layout[]` into the uniform top-level `pages[].widgets[]`
3. Lifts `sidebarTabs[].widgets[]` to `slot: "sidebar"` widget entries
4. Flattens settings `sections[].widgets[]` and `tabs[]` to `slot: "section:*"` / `slot: "tab:*"`
5. Migrates `cardComponent` to a `card-grid` widget entry
6. Adds explicit `type: "handler"` to action entries where `type` was omitted
7. Migrates `customComponents` → `registry` map

Items requiring manual attention are listed in the migration report (`--report`).

## Where to next

- **[Migrating to the JSON manifest](/docs/migrating-to-manifest)** — the step-by-step guide for moving an existing hand-wired app onto the manifest pattern. Read this when you're ready to adopt.
- **[App design principles](./app-design-principles.md)** — the chassis, atoms, and stacked views the manifest fills.
- **[Schemas and registers](./schemas-and-registers.md)** — the data side of the contract. Every `index` and `detail` page references a register + schema; this is where they come from.
- **[useAppManifest composable](/docs/utilities/composables/use-app-manifest)** — the runtime entry-point if you want to consume the manifest yourself rather than letting `CnAppRoot` do it.
