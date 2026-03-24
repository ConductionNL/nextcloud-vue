<p align="center">
  <img src="https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/img/logo.svg" alt="@conduction/nextcloud-vue logo" width="80" height="80">
</p>

<h1 align="center">@conduction/nextcloud-vue</h1>

<p align="center">
  <strong>Shared Vue 2 component library for Conduction Nextcloud apps — higher-level UI, OpenRegister integration, and NL Design System support</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@conduction/nextcloud-vue"><img src="https://img.shields.io/npm/v/@conduction/nextcloud-vue" alt="npm version"></a>
  <a href="https://github.com/ConductionNL/nextcloud-vue/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-EUPL--1.2-blue" alt="License"></a>
  <a href="https://github.com/ConductionNL/nextcloud-vue/actions"><img src="https://img.shields.io/github/actions/workflow/status/ConductionNL/nextcloud-vue/code-quality.yml?label=quality" alt="Code quality"></a>
</p>

---

`@conduction/nextcloud-vue` is an npm component library that sits on top of `@nextcloud/vue` and provides higher-level, opinionated components for building Nextcloud apps. It handles the repetitive patterns — schema-driven tables, CRUD dialogs, paginated lists, faceted search — so each app only writes the domain-specific parts.

Used internally by [Pipelinq](https://github.com/ConductionNL/pipelinq), [Procest](https://github.com/ConductionNL/procest), [Larping](https://github.com/ConductionNL/larpingapp), and other Conduction Nextcloud apps.

> **Requires:** Vue 2.7, Pinia 2, @nextcloud/vue 8

## Features

### Layout & Page Components

| Component | Description |
|-----------|-------------|
| `CnIndexPage` | Zero-config index page with table/card views, built-in CRUD dialogs, pagination, mass actions, and faceted search |
| `CnPageHeader` | Page header with icon, title, and description |
| `CnActionsBar` | Action bar with add button, mass action triggers, view toggle (table/grid), and search |
| `CnIndexSidebar` | Sidebar for index pages |

### Data Display

| Component | Description |
|-----------|-------------|
| `CnDataTable` | Sortable table with multi-select, schema-driven columns, loading states, and empty states |
| `CnCardGrid` | Responsive card grid for object summaries |
| `CnObjectCard` | Single object card with title, metadata, and actions |
| `CnCellRenderer` | Type-aware cell formatter for strings, numbers, dates, objects, arrays, and booleans |
| `CnFacetSidebar` | Faceted filter sidebar with aggregated count buckets |
| `CnPagination` | Full pagination with page numbers, size selector, and "go to page" |
| `CnFilterBar` | Search input with filter controls |
| `CnKpiGrid` | KPI metric cards for statistics dashboards |

### Single-Object Dialogs

| Component | Description |
|-----------|-------------|
| `CnFormDialog` | Schema-driven form dialog for create and edit; auto-generates fields from JSON Schema |
| `CnDeleteDialog` | Delete confirmation with two-phase confirm/result pattern |
| `CnCopyDialog` | Copy dialog with naming pattern selector |

### Mass-Action Dialogs

| Component | Description |
|-----------|-------------|
| `CnMassDeleteDialog` | Bulk delete confirmation |
| `CnMassCopyDialog` | Bulk copy with per-item naming |
| `CnMassExportDialog` | Export selected items (JSON, CSV, …) |
| `CnMassImportDialog` | Bulk import with file upload and format detection |

### Settings & Config

| Component | Description |
|-----------|-------------|
| `CnSettingsCard` | Collapsible settings card with save state |
| `CnSettingsSection` | Container for grouping settings |
| `CnConfigurationCard` | Configuration card with status indicator |
| `CnVersionInfoCard` | Version information display |
| `CnStatsBlock` | Statistics block with count and breakdown |
| `CnRegisterMapping` | Register-to-field mapping configuration |

### State Management

| Export | Description |
|--------|-------------|
| `useObjectStore(id)` | Generic Pinia store for OpenRegister CRUD — pagination, search, caching |
| `createObjectStore(id)` | Factory for custom-scoped object stores |
| `createSubResourcePlugin(name)` | Plugin factory for sub-resource management |
| `auditTrailsPlugin` | Adds audit trail state and getters |
| `relationsPlugin` | Manages object relations/associations |
| `filesPlugin` | Handles file attachments and uploads |
| `lifecyclePlugin` | Tracks lifecycle states (draft, published, archived) |
| `registerMappingPlugin` | Manages register-to-field mappings |

### Composables

| Composable | Description |
|------------|-------------|
| `useListView(options)` | Manages list view state: search debounce, filter state, sort, pagination |
| `useDetailView(options)` | Manages detail view: load, edit, delete, validation |
| `useSubResource(options)` | Manages sub-resource operations |

### Schema Utilities

| Function | Description |
|----------|-------------|
| `columnsFromSchema(schema)` | Auto-generate data table column definitions from JSON Schema |
| `fieldsFromSchema(schema)` | Auto-generate form field definitions from JSON Schema |
| `filtersFromSchema(schema)` | Auto-generate filter definitions from JSON Schema |
| `formatValue(value, format)` | Type-aware cell value formatter |

## Architecture

```mermaid
graph TD
    A[Nextcloud App] -->|imports| B[@conduction/nextcloud-vue]
    B --> C[Components]
    B --> D[useObjectStore]
    B --> E[Composables]
    B --> F[Schema Utils]
    D -->|CRUD| G[OpenRegister REST API]
    C -->|styles via| H[Nextcloud CSS Variables]
    C -->|NL Design tokens| I[--nldesign-* CSS vars]
```

### Two-Phase Dialog Pattern

All dialogs follow a predictable confirm/result flow that keeps parent components in control of API calls:

```js
// 1. Dialog emits @confirm with user input
// 2. Parent handles API call
// 3. Parent calls dialog.setResult(response) via $ref
// 4. Dialog shows toast and auto-closes
```

### Schema-Driven Components

Pass a JSON Schema and get a fully working table or form with zero configuration:

```vue
<CnIndexPage
  :schema="caseTypeSchema"
  :objects="caseTypes"
  @save="onSave"
  @delete="onDelete"
/>
```

## Installation

```bash
npm install @conduction/nextcloud-vue
```

Import the CSS alongside your component imports:

```js
import '@conduction/nextcloud-vue/dist/nextcloud-vue.css'
import { CnIndexPage, useObjectStore } from '@conduction/nextcloud-vue'
```

### Webpack Alias (for local development)

When developing against the source directly, add deduplication aliases in `webpack.config.js` to prevent dual-instance bugs:

```js
config.resolve.alias = {
  '@conduction/nextcloud-vue': path.resolve(__dirname, '../nextcloud-vue/src'),
  'vue': path.resolve(__dirname, 'node_modules/vue'),
  'pinia': path.resolve(__dirname, 'node_modules/pinia'),
  '@nextcloud/vue': path.resolve(__dirname, 'node_modules/@nextcloud/vue'),
}
```

> **Important:** Without these aliases, webpack may resolve Vue and Pinia from the library's `node_modules`, creating dual instances that break reactivity and state management.

## Directory Structure

```
nextcloud-vue/
├── src/
│   ├── index.js              # Main barrel export
│   ├── components/           # 30+ Vue 2 SFCs (one directory each)
│   │   ├── CnIndexPage/
│   │   ├── CnDataTable/
│   │   ├── CnFormDialog/
│   │   └── ...
│   ├── store/
│   │   ├── index.js          # useObjectStore, createObjectStore
│   │   └── plugins/          # auditTrails, relations, files, lifecycle, registerMapping
│   ├── composables/          # useListView, useDetailView, useSubResource
│   ├── utils/                # schema, headers, errors, formatting
│   ├── css/                  # Modular CSS (one file per component group)
│   └── types/index.d.ts      # TypeScript definitions
├── tests/                    # Jest test suite
├── dist/                     # Built output (ESM, CJS, CSS)
├── rollup.config.js          # Build configuration
└── package.json
```

## Development

```bash
npm install
npm run dev       # Watch mode (Rollup)
npm run build     # Production build
npm test          # Jest tests
npm run lint      # ESLint
npm run stylelint # Stylelint
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Vue 2.7 (Options API) |
| State | Pinia 2 |
| Build | Rollup 3 |
| CSS | PostCSS (extracted to dist/nextcloud-vue.css) |
| Testing | Jest 29, @vue/test-utils 1 |
| Quality | ESLint (@nextcloud/eslint-config), Stylelint |
| Release | semantic-release (automated npm publish) |

## License

EUPL-1.2

## Authors

Built by [Conduction](https://conduction.nl) — open-source software for Dutch government and public sector organizations.