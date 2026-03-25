# @conduction/nextcloud-vue — Shared Component Library

## Overview

A shared Vue 2 component library for Conduction Nextcloud apps. It complements `@nextcloud/vue` with higher-level components (data tables, list layouts, dialogs, form generation), supports NL Design System theming (via Nextcloud CSS variables), and includes a generic Pinia store for OpenRegister CRUD operations.

**Consumers**: OpenRegister, OpenCatalogi, Procest, Pipelinq, MyDash

## Architecture

- **Type**: npm package (shared Vue 2 component library)
- **Framework**: Vue 2.7 (Options API), Pinia for state
- **Build**: Rollup (ESM + CJS + extracted CSS)
- **Peer deps**: vue, pinia, @nextcloud/vue, @nextcloud/l10n, vue-material-design-icons
- **Pattern**: Barrel exports — each component has `CnComponent/index.js`, aggregated in `components/index.js` and `src/index.js`
- **License**: EUPL-1.2

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Vue 2.7 (Options API) |
| State | Pinia with plugin architecture |
| Build | Rollup 3.29, rollup-plugin-vue, postcss |
| Test | Jest, @vue/test-utils |
| Lint | ESLint (@nextcloud/eslint-config), Stylelint |
| CSS | Modular CSS with `cn-` prefix, Nextcloud CSS variables |
| Release | semantic-release (automated npm publishing) |
| CI | GitHub Actions (code-quality.yml, release.yml) |

## Components (30)

### Layout & Pages (3)
| Component | Purpose |
|-----------|---------|
| CnIndexPage | Zero-config schema-driven index page (table/cards, dialogs, mass actions) |
| CnPageHeader | Page header with icon, title, description |
| CnActionsBar | Action bar with add button, mass actions, view toggle, search |

### Data Display (7)
| Component | Purpose |
|-----------|---------|
| CnDataTable | Sortable table with selection, schema-driven columns |
| CnCardGrid | Grid of object cards |
| CnObjectCard | Single object card |
| CnCellRenderer | Type-aware cell value formatting |
| CnFilterBar | Search + filter controls |
| CnFacetSidebar | Faceted filter sidebar |
| CnPagination | Full pagination with page numbers and size selector |

### Single-Object Dialogs (3)
| Component | Purpose |
|-----------|---------|
| CnDeleteDialog | Delete confirmation (two-phase: confirm, result) |
| CnCopyDialog | Copy with naming pattern (two-phase) |
| CnFormDialog | Schema-driven create/edit form (two-phase, slot overrides) |

### Mass-Action Dialogs (4)
| Component | Purpose |
|-----------|---------|
| CnMassDeleteDialog | Bulk delete confirmation |
| CnMassCopyDialog | Bulk copy with naming patterns |
| CnMassExportDialog | Bulk export with format selection |
| CnMassImportDialog | Bulk import with file upload |

### UI Elements (7)
| Component | Purpose |
|-----------|---------|
| CnStatusBadge | Color-coded status/priority badge |
| CnRowActions | Row action buttons (inline + overflow) |
| CnMassActionBar | Floating mass action triggers |
| CnIcon | MDI icon by name |
| CnKpiGrid | KPI metric cards |
| CnIndexSidebar | Index page sidebar |
| CnRegisterMapping | Register mapping configuration |

### Settings (5)
| Component | Purpose |
|-----------|---------|
| CnSettingsCard | Collapsible settings card |
| CnSettingsSection | Settings section container |
| CnConfigurationCard | Configuration card with status |
| CnVersionInfoCard | Version info display |
| CnStatsBlock | Stats display with breakdown |

## Design Patterns

### Two-Phase Dialog Pattern
All dialogs (single + mass) use confirm then result. Dialog emits `@confirm`, parent makes API call, parent calls `setResult()` via ref. Success auto-closes after 2 seconds.

### Schema-Driven Development
CnDataTable, CnFormDialog, CnIndexPage can auto-generate columns/fields from JSON Schema. Utilities: `columnsFromSchema()`, `fieldsFromSchema()`, `filtersFromSchema()`.

### Three-Level Dialog Override (CnIndexPage)
1. Full dialog replacement via named slots (`#form-dialog`, `#delete-dialog`, `#copy-dialog`)
2. Form content override via `#form-fields` slot
3. Per-field override via `#field-{key}` slots

### Nextcloud-Native Theming
CSS uses Nextcloud's own CSS variables (`--color-*`, `--border-radius`, etc.) exclusively. The nldesign app overrides these variables with NL Design System values, so theming works automatically without any `--nldesign-*` references in this package.

### Store Plugin Architecture
`useObjectStore` supports plugins (`auditTrailsPlugin`, `relationsPlugin`, `filesPlugin`, `lifecyclePlugin`, `registerMappingPlugin`) that contribute state, getters, and actions for sub-resources.

## Key Directories

```
nextcloud-vue/
├── src/
│   ├── index.js              # Main barrel export
│   ├── components/           # 30 Vue SFC components (Cn-prefixed)
│   ├── store/                # Pinia stores + plugins
│   ├── composables/          # Vue composables (useListView, etc.)
│   ├── utils/                # Utility functions (schema, headers, errors)
│   ├── constants/            # Metadata column definitions
│   ├── css/                  # 12 modular CSS files
│   └── types/                # TypeScript definitions
├── tests/                    # Jest tests (store, utils)
├── dist/                     # Built output (ESM, CJS, CSS)
├── openspec/                 # OpenSpec specs and changes
├── CLAUDE.md                 # Agent instructions
└── project.md                # This file
```

## Development

- **Build**: `npm run build` (Rollup → dist/)
- **Dev**: `npm run dev` (watch mode)
- **Test**: `npm test` (Jest)
- **Lint**: `npm run lint` + `npm run stylelint`
- **Publish**: Automated via semantic-release on push to main
- **Install in app**: `npm install @conduction/nextcloud-vue` or git dependency
