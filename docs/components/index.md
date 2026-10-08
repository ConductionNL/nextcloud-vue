---
sidebar_position: 3
---

# Component Reference

All components exported by `@conduction/nextcloud-vue`, organized by category.

:::tip Standalone playground
Every component page below embeds a live demo via `<Playground />` — that's the canonical way to preview a component. If you want the full Vue Styleguidist UI on its own (no narrative, just the interactive sandbox), it's mounted by the gh-pages deploy at <a href="/styleguide/"><strong>/styleguide/</strong></a> — same component set, deep-link via <code>/styleguide/#!/CnDataTable</code>.
:::

## OpenRegister reliance

Every component is scored on how much it relies on OpenRegister: the references in its own source, plus the files it reaches through its imports. The tier **none** is the shortlist of components that can move to another host first. The numbers are generated on every docs build by `scripts/openregister-reliance.js`; each component page repeats its own line under its reference.

The last three columns come from the buildiq parity project on Tables. **Destination** says where a component goes: `tables` is the Tables app, `nc-vue` is a proposal to Nextcloud's own Vue library, `none` means it is dropped. **Week** is the ISO week we bring it there. **Screenshot** says whether the styleguide renders it today; a component that needs an example has a props page but nothing to show yet. The source is `docs/project/14-component-destinations.md` in the Tables fork; a component without values there is not part of that project.

import RelianceTable from '@site/src/components/RelianceTable'

<RelianceTable />

## Page Layout

| Component | Description |
|-----------|-------------|
| [CnIndexPage](./cn-index-page.md) | Schema-driven list page with table, filters, pagination, and CRUD dialogs |
| [CnIndexSidebar](./cn-index-sidebar.md) | Tabbed sidebar with search, filter, and column visibility controls |
| [CnFacetSidebar](./cn-facet-sidebar.md) | Faceted search sidebar auto-generated from schema |

## Data Display

| Component | Description |
|-----------|-------------|
| [CnDataTable](./cn-data-table.md) | Sortable data table with selection and schema-driven columns |
| [CnCellRenderer](./cn-cell-renderer.md) | Type-aware cell renderer for schema-driven tables |
| [CnObjectCard](./cn-object-card.md) | Schema-driven card for object display |
| [CnCardGrid](./cn-card-grid.md) | Responsive CSS grid for CnObjectCard instances |
| [CnStatusBadge](./cn-status-badge.md) | Color-coded pill badge for status/priority |
| [CnKpiGrid](./cn-kpi-grid.md) | Responsive grid layout for KPI cards |
| [CnStatsBlock](./cn-stats-block.md) | Statistics card with icon, count, and breakdown |
| [CnProgressBar](./cn-progress-bar.md) | Labeled horizontal progress bars with variant colors |
| [CnItemCard](./cn-item-card.md) | Compact card for sidebar list items with icon, title, and actions |

## Data Actions

| Component | Description |
|-----------|-------------|
| [CnFilterBar](./cn-filter-bar.md) | Search and filter controls row |
| [CnPagination](./cn-pagination.md) | Full pagination with page numbers and size selector |
| [CnRowActions](./cn-row-actions.md) | Action menu for table rows and cards |
| [CnMassActionBar](./cn-mass-action-bar.md) | Mass action dropdown for selected items |

## Dialogs

| Component | Description |
|-----------|-------------|
| [CnDeleteDialog](./cn-delete-dialog.md) | Two-phase single-item delete confirmation |
| [CnCopyDialog](./cn-copy-dialog.md) | Two-phase single-item copy with naming pattern |
| [CnFormDialog](./cn-form-dialog.md) | Schema-driven create/edit form dialog with async select and custom option slots |
| [CnAdvancedFormDialog](./cn-advanced-form-dialog.md) | Create/edit with properties table, JSON tab, and optional metadata/store |
| [CnMassDeleteDialog](./cn-mass-delete-dialog.md) | Two-phase mass delete with item review |
| [CnMassCopyDialog](./cn-mass-copy-dialog.md) | Two-phase mass copy with pattern selector |
| [CnMassExportDialog](./cn-mass-export-dialog.md) | Export format selection dialog |
| [CnMassImportDialog](./cn-mass-import-dialog.md) | File upload with options and results summary |

## Settings

| Component | Description |
|-----------|-------------|
| [CnSettingsCard](./cn-settings-card.md) | Collapsible card for settings sections |
| [CnSettingsSection](./cn-settings-section.md) | Admin settings section with loading/error states |
| [CnConfigurationCard](./cn-configuration-card.md) | Configuration card with title, actions, and status |
| [CnVersionInfoCard](./cn-version-info-card.md) | App version information card for admin settings |
| [CnRegisterMapping](./cn-register-mapping.md) | OpenRegister register/schema configuration panel |

## Dashboard Widgets

The dashboard widget library — the catalog shared by Buildiq and Launchpad.

| Component | Description |
|-----------|-------------|
| [Dashboard Widget Catalog](./dashboard-widget-catalog.md) | **Start here** — all 25 dashboard widget types with screenshots, grouped by category |
| [CnWidgetGrid](./cn-widget-grid.md) | The grid host and registry-resolution boundary for widget placements |
| [CnAddWidgetModal](./cn-add-widget-modal.md) | Unified add/edit modal with the per-type widget sub-forms |

## Cards

| Component | Description |
|-----------|-------------|
| [CnCard](../cards/cn-card.md) | Generic prop-driven card with title, icon, description, labels, stats, and active state |

## Utilities

| Export | Description |
|--------|-------------|
| [CnIcon](./cn-icon.md) | Renders MDI icon by PascalCase name from extensible registry |
| [registerIcons](./cn-icon.md#registering-icons) | Register MDI icon components at app boot |
