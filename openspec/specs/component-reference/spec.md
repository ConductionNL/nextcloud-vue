# component-reference Specification

## Purpose

Defines the per-component documentation pages that explain each Cn* component's purpose, props, events, slots, and usage examples. This is the primary reference for developers building apps with `@conduction/nextcloud-vue`.

## ADDED Requirements

### Requirement: Component Reference Index

The docs site MUST include a `docs/components/index.md` page that lists all exported components grouped by category:
- **Page Layout** — CnIndexPage, CnIndexSidebar, CnFacetSidebar
- **Data Display** — CnDataTable, CnCellRenderer, CnObjectCard, CnCardGrid, CnStatusBadge, CnKpiGrid, CnStatsBlock
- **Data Actions** — CnFilterBar, CnPagination, CnRowActions, CnMassActionBar
- **Dialogs** — CnDeleteDialog, CnCopyDialog, CnFormDialog, CnMassDeleteDialog, CnMassCopyDialog, CnMassExportDialog, CnMassImportDialog
- **Settings** — CnSettingsCard, CnSettingsSection, CnConfigurationCard, CnVersionInfoCard, CnRegisterMapping
- **Utilities** — CnIcon, registerIcons

Each entry MUST link to its dedicated component page.

#### Scenario: Developer browses component list

- GIVEN a developer visits the component reference index
- WHEN they scan the page
- THEN they see all components organized by category with links to individual pages

### Requirement: Individual Component Pages

Each exported component MUST have its own documentation page at `docs/components/{component-name}.md` containing:
1. **Description** — What the component does and when to use it
2. **Props table** — Name, type, default, required, and description for each prop
3. **Events table** — Event name, payload, and description (if the component emits events)
4. **Slots table** — Slot name and description (if the component has named slots)
5. **Usage example** — A code snippet showing typical usage in a Vue SFC `<template>`
6. **Nextcloud relationship** — Which Nextcloud Vue primitive(s) it wraps or extends, with a link to the [Nextcloud Vue Components](https://nextcloud-vue-components.netlify.app/) documentation

#### Scenario: Developer looks up CnIndexPage

- GIVEN a developer visits the CnIndexPage component page
- WHEN they read the page
- THEN they see a description, props table (schema, objectStore, etc.), events, slots, a usage example, and a note explaining it wraps NcAppContent

#### Scenario: Developer looks up CnIcon

- GIVEN a developer visits the CnIcon component page
- WHEN they read the page
- THEN they see the `registerIcons()` pattern documented alongside the component props, explaining how apps register their own MDI icons

### Requirement: Store and Composable Reference

The docs site MUST include reference pages for the non-component exports:
- `docs/store/object-store.md` — `createObjectStore`, `useObjectStore`, `emptyPaginated`
- `docs/store/plugins.md` — `auditTrailsPlugin`, `relationsPlugin`, `filesPlugin`, `lifecyclePlugin`, `registerMappingPlugin`, `createSubResourcePlugin`
- `docs/composables/index.md` — `useListView`, `useDetailView`, `useSubResource`
- `docs/utilities/index.md` — `buildHeaders`, `buildQueryString`, `columnsFromSchema`, `filtersFromSchema`, `fieldsFromSchema`, `formatValue`, error utilities

Each page MUST document the function signature, parameters, return value, and a usage example.

#### Scenario: Developer looks up createObjectStore

- GIVEN a developer visits the object store reference page
- WHEN they read the createObjectStore section
- THEN they see the function signature, configuration options (plugins array, base URL), return value (Pinia store with CRUD methods), and an example

#### Scenario: Developer looks up plugins

- GIVEN a developer visits the plugins reference page
- WHEN they read about relationsPlugin
- THEN they see what methods it adds to the store (e.g., `fetchRelations`), what it requires (schema with relation properties), and an example showing how to add it to createObjectStore

### Requirement: Props Documentation Accuracy

All props tables MUST be derived from the actual component source code. Every prop listed in a component's `props` definition MUST appear in the docs table. No props SHALL be fabricated.

#### Scenario: Props match source code

- GIVEN a developer compares the CnDataTable props table in the docs with `CnDataTable.vue`'s `props` definition
- WHEN they check each prop
- THEN every prop from the source appears in the docs and no extra props are listed

## MODIFIED Requirements

_(none — all new)_

## REMOVED Requirements

_(none — all new)_

---

### Current Implementation Status

**Already implemented:**

- **Component Reference Index:** `docs/components/index.md` exists with components listed. 27 individual component pages exist in `docs/components/`:
  - cn-card-grid.md, cn-cell-renderer.md, cn-configuration-card.md, cn-copy-dialog.md, cn-data-table.md, cn-delete-dialog.md, cn-facet-sidebar.md, cn-filter-bar.md, cn-form-dialog.md, cn-icon.md, cn-index-page.md, cn-index-sidebar.md, cn-kpi-grid.md, cn-mass-action-bar.md, cn-mass-copy-dialog.md, cn-mass-delete-dialog.md, cn-mass-export-dialog.md, cn-mass-import-dialog.md, cn-object-card.md, cn-pagination.md, cn-register-mapping.md, cn-row-actions.md, cn-settings-card.md, cn-settings-section.md, cn-stats-block.md, cn-status-badge.md, cn-version-info-card.md

- **Store and Composable Reference:**
  - `docs/store/object-store.md` — Documents `createObjectStore`, `useObjectStore`
  - `docs/store/plugins.md` — Documents `auditTrailsPlugin`, `relationsPlugin`, `filesPlugin`, `lifecyclePlugin`, `registerMappingPlugin`, `createSubResourcePlugin`
  - `docs/utilities/composables/` — Directory exists for composable documentation
  - `docs/utilities/index.md` — Utility functions reference

**Source files for props verification:**
- All 38 components live in `src/components/Cn*/Cn*.vue`
- Store: `src/store/useObjectStore.js`, `src/store/createSubResourcePlugin.js`
- Store plugins: `src/store/plugins/auditTrails.js`, `relations.js`, `files.js`, `lifecycle.js`, `registerMapping.js`
- Composables: `src/composables/useListView.js`, `useDetailView.js`, `useSubResource.js`, `useDashboardView.js`
- Utilities: `src/utils/schema.js`, `src/utils/headers.js`, `src/utils/errors.js`

**Not yet implemented:**
- Dashboard components (CnDashboardPage, CnDashboardGrid, CnWidgetWrapper, CnWidgetRenderer, CnTileWidget) do NOT have individual doc pages in `docs/components/`
- CnTimelineStages does not have a doc page
- CnActionsBar, CnPageHeader, CnDetailCard, CnDetailPage, CnObjectSidebar, CnChartWidget do not have individual doc pages
- The spec requires component category grouping (Page Layout, Data Display, Data Actions, Dialogs, Settings, Utilities) — needs verification against the actual `docs/components/index.md` content
- `emptyPaginated` utility is exported from the store but may not be documented

### Standards & References

- **Props tables** must be derived from actual source code `props` definitions — the spec explicitly forbids fabricated props
- **Nextcloud Vue Components** reference: https://nextcloud-vue-components.netlify.app/
- **Nextcloud Layout Components** reference: https://docs.nextcloud.com/server/stable/developer_manual/design/layoutcomponents.html
- **JSDoc** — Source components have JSDoc on props which can be used to auto-generate docs
- **WCAG AA** — Component docs should note accessibility features inherited from Nextcloud Vue

### Specificity Assessment

- **Specific enough?** Yes, the six-section format per component page (Description, Props, Events, Slots, Usage, NC relationship) is clear and actionable.
- **Missing/ambiguous:**
  - The component categories in the spec's index don't include Dashboard components (CnDashboardPage, CnDashboardGrid, CnWidgetWrapper, CnWidgetRenderer, CnTileWidget) or the newer CnTimelineStages, CnChartWidget, CnDetailPage, CnDetailCard, CnObjectSidebar components.
  - The `registerMappingPlugin` is exported from `src/store/plugins/` but not listed in the spec's store plugins section.
  - No mention of `useDashboardView` composable in the composable reference requirement.
  - The spec lists `formatValue` in utilities but the actual export path is `src/utils/schema.js` (alongside `columnsFromSchema`, `filtersFromSchema`, `fieldsFromSchema`).
- **Open questions:**
  - Should the component reference use auto-generated docs from JSDoc, or manually maintained markdown?
  - How should internal-only components (used by CnIndexPage but not meant for direct use) be documented?
