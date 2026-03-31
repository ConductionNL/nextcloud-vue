---
status: reviewed
---

# component-reference Specification

## Purpose

Defines the per-component documentation pages that explain each Cn* component's purpose, props, events, slots, and usage examples. This is the primary reference for developers building apps with `@conduction/nextcloud-vue`.

## Requirements

### Requirement: Component Reference Index

The docs site MUST include a `docs/components/index.md` page that lists all exported components grouped by category:
- **Layout & Pages** — CnIndexPage, CnIndexSidebar, CnPageHeader, CnActionsBar, CnDetailPage, CnDetailCard, CnObjectSidebar
- **Data Display** — CnDataTable, CnCellRenderer, CnObjectCard, CnCardGrid, CnStatusBadge, CnKpiGrid, CnStatsBlock, CnTimelineStages, CnNotesCard, CnTasksCard
- **Data Actions** — CnFilterBar, CnPagination, CnRowActions, CnMassActionBar, CnFacetSidebar, CnUserActionMenu
- **Dialogs** — CnDeleteDialog, CnCopyDialog, CnFormDialog, CnAdvancedFormDialog, CnMassDeleteDialog, CnMassCopyDialog, CnMassExportDialog, CnMassImportDialog
- **Dashboard** — CnDashboardPage, CnDashboardGrid, CnWidgetWrapper, CnWidgetRenderer, CnTileWidget, CnChartWidget
- **Settings** — CnSettingsCard, CnSettingsSection, CnConfigurationCard, CnVersionInfoCard, CnRegisterMapping
- **UI Elements** — CnIcon, registerIcons

Each entry MUST link to its dedicated component page.

#### Scenario: Developer browses component list

- GIVEN a developer visits the component reference index
- WHEN they scan the page
- THEN they SHALL see all 42 exported components organized into 7 categories with links to individual pages

#### Scenario: Category grouping matches library barrel exports

- GIVEN the component reference index is published
- WHEN a developer compares the listed components to `src/index.js` barrel exports
- THEN every exported component MUST appear in exactly one category and no unlisted components SHALL exist

#### Scenario: Developer searches for a dialog component

- GIVEN a developer needs a bulk delete confirmation dialog
- WHEN they browse the Dialogs category on the index page
- THEN they SHALL find CnMassDeleteDialog with a link to its dedicated documentation page

### Requirement: Individual Component Pages

Each exported component MUST have its own documentation page at `docs/components/{component-name}.md` containing:
1. **Description** — What the component does and when to use it
2. **Props table** — Name, type, default, required, and description for each prop
3. **Events table** — Event name, payload, and description (if the component emits events)
4. **Slots table** — Slot name, scope bindings, and description (if the component has named slots)
5. **Usage example** — A complete Vue SFC `<template>` snippet showing typical usage
6. **Nextcloud relationship** — Which Nextcloud Vue primitive(s) it wraps or extends, with a link to the Nextcloud Vue Components documentation

#### Scenario: Developer looks up CnIndexPage

- GIVEN a developer visits the CnIndexPage component page
- WHEN they read the page
- THEN they SHALL see a description, props table (schema, objects, pagination, loading, selectable, viewMode, etc.), events table (@create, @edit, @delete, @copy, @refresh, @mass-delete, @mass-copy, @mass-export, @mass-import), slots table (#delete-dialog, #copy-dialog, #form-dialog, #form-fields, #field-{key}, #mass-actions, #action-items, #header-actions, #import-fields), a usage example, and a note explaining it composes CnActionsBar, CnDataTable, CnCardGrid, CnPagination and all dialog components

#### Scenario: Developer looks up CnIcon

- GIVEN a developer visits the CnIcon component page
- WHEN they read the page
- THEN they SHALL see the `registerIcons()` pattern documented alongside the component props, explaining how apps register their own MDI icons and the PascalCase resolution with HelpCircleOutline fallback

#### Scenario: Developer looks up CnDashboardPage

- GIVEN a developer visits the CnDashboardPage component page
- WHEN they read the page
- THEN they SHALL see documentation for the three widget types (custom, NC Dashboard API, tile), the props table including widgets, layout, allowEdit, columns, cellHeight, and string label props, events (@layout-change, @edit-toggle), and slots (#header-actions, #widget-{widgetId}, #empty)

#### Scenario: Developer looks up CnAdvancedFormDialog

- GIVEN a developer visits the CnAdvancedFormDialog component page
- WHEN they read the page
- THEN they SHALL see documentation explaining its difference from CnFormDialog (properties table with click-to-edit, Data/JSON tab with CodeMirror, optional Metadata tab), props for useObjectStore integration, and the two-phase confirm-then-result pattern

#### Scenario: Developer looks up CnDetailPage

- GIVEN a developer visits the CnDetailPage component page
- WHEN they read the page
- THEN they SHALL see documentation for the detail view layout pattern, its relationship to CnDetailCard and CnObjectSidebar, and how it integrates with useDetailView composable

### Requirement: Props Documentation Accuracy

All props tables MUST be derived from the actual component source code in `src/components/Cn*/Cn*.vue`. Every prop listed in a component's `props` definition MUST appear in the docs table. No props SHALL be fabricated. Props inherited from Nextcloud Vue parent components MUST be noted separately.

#### Scenario: Props match source code for CnDataTable

- GIVEN a developer compares the CnDataTable props table in the docs with `CnDataTable.vue`'s `props` definition
- WHEN they check each prop
- THEN every prop from the source MUST appear in the docs and no extra props SHALL be listed

#### Scenario: Props match source code for CnFormDialog

- GIVEN a developer compares the CnFormDialog props table in the docs with `CnFormDialog.vue`'s `props` definition
- WHEN they check each prop
- THEN every prop from the source MUST appear in the docs, including schema, item, title, confirmLabel, and any slot-related props

#### Scenario: Deprecated props are marked

- GIVEN a component has deprecated a prop with `console.warn` (per library rules)
- WHEN the documentation page renders that prop
- THEN the prop MUST be marked as deprecated with a note explaining the replacement

### Requirement: Events Documentation

Each component that emits events MUST document every emitted event with its name, payload type/shape, and a description of when it fires. Events emitted by child components that bubble up (e.g., CnIndexPage re-emitting CnDataTable events) MUST be documented on the parent component page.

#### Scenario: CnIndexPage event documentation is complete

- GIVEN a developer reads the CnIndexPage events table
- WHEN they review the events
- THEN they SHALL find @create, @edit, @delete, @copy, @refresh, @mass-delete, @mass-copy, @mass-export, @mass-import, @sort, @page-change, @filter-change, @search, and @row-click documented with payload shapes

#### Scenario: Two-phase dialog events are explained

- GIVEN a developer reads the CnDeleteDialog events table
- WHEN they review the confirm event
- THEN the documentation SHALL explain the two-phase pattern: @confirm fires when the user clicks confirm, then the parent calls setDeleteResult() to close the dialog with success/error state

#### Scenario: Developer understands event payload

- GIVEN a developer reads the @mass-export event documentation
- WHEN they look at the payload
- THEN they SHALL see the payload shape includes format, selectedIds, and any export options

### Requirement: Slots Documentation

Each component with named slots or scoped slots MUST document every slot with its name, scope bindings (if scoped), and a usage example showing how to use the slot.

#### Scenario: CnIndexPage slots are fully documented

- GIVEN a developer reads the CnIndexPage slots documentation
- WHEN they review all available slots
- THEN they SHALL find #delete-dialog, #copy-dialog, #form-dialog (with item, schema, close scope), #form-fields, #field-{key}, #mass-actions (with count, selectedIds scope), #action-items, #header-actions, and #import-fields documented

#### Scenario: Scoped slot bindings are typed

- GIVEN a developer reads the #form-dialog slot documentation
- WHEN they look at the scope bindings
- THEN they SHALL see `item` (Object|null), `schema` (Object), and `close` (Function) documented with their types

#### Scenario: Slot override hierarchy is explained

- GIVEN a developer reads the CnIndexPage slots documentation
- WHEN they look for the dialog override system
- THEN they SHALL find the three-level hierarchy explained: full dialog replacement via named slot, form content override via #form-fields, and per-field override via #field-{key}

### Requirement: Store and Composable Reference

The docs site MUST include reference pages for the non-component exports:
- `docs/store/object-store.md` — `createObjectStore`, `useObjectStore`, `emptyPaginated`
- `docs/store/plugins.md` — `auditTrailsPlugin`, `relationsPlugin`, `filesPlugin`, `lifecyclePlugin`, `registerMappingPlugin`, `selectionPlugin`, `searchPlugin`, `createSubResourcePlugin`
- `docs/composables/index.md` — `useListView`, `useDetailView`, `useSubResource`, `useDashboardView`
- `docs/utilities/index.md` — `buildHeaders`, `buildQueryString`, `parseResponseError`, `networkError`, `genericError`, `columnsFromSchema`, `filtersFromSchema`, `fieldsFromSchema`, `formatValue`

Each page MUST document the function signature, parameters, return value, and a usage example.

#### Scenario: Developer looks up createObjectStore

- GIVEN a developer visits the object store reference page
- WHEN they read the createObjectStore section
- THEN they SHALL see the function signature `createObjectStore(id, options)`, the options object (plugins array, baseUrl), the return value (Pinia store factory with CRUD methods: fetchCollection, fetchSingle, createObject, updateObject, deleteObject, registerObjectType), and an example

#### Scenario: Developer looks up plugins

- GIVEN a developer visits the plugins reference page
- WHEN they read about relationsPlugin
- THEN they SHALL see what methods it adds to the store (fetchRelations), what it requires (schema with $ref properties), and an example showing how to add it to createObjectStore's plugins array

#### Scenario: Developer looks up searchPlugin

- GIVEN a developer visits the plugins reference page
- WHEN they read about searchPlugin
- THEN they SHALL see the SEARCH_TYPE constants, getRegisterApiUrl and getSchemaApiUrl helpers, and an example showing search configuration

#### Scenario: Developer looks up useListView composable

- GIVEN a developer visits the composables reference page
- WHEN they read about useListView
- THEN they SHALL see both the new API (`useListView('objectType', options)`) and the legacy API (`useListView(options)`) documented with their return values including schema, objects, loading, pagination, onSearch, onSort, onFilterChange, onPageChange, and refresh

#### Scenario: Developer looks up useDashboardView composable

- GIVEN a developer visits the composables reference page
- WHEN they read about useDashboardView
- THEN they SHALL see the options (widgets, defaultLayout, loadLayout, saveLayout, includeNcWidgets) and return values (widgets, layout, loading, saving, onLayoutChange, addWidget, removeWidget)

### Requirement: Usage Examples with Copy-Paste Code

Every component page MUST include at least one complete, copy-pasteable Vue SFC snippet (not pseudocode). The snippet MUST use correct import paths (`@conduction/nextcloud-vue`), correct prop names, and valid Vue 2 Options API or Composition API syntax.

#### Scenario: CnDataTable usage example is runnable

- GIVEN a developer copies the CnDataTable usage example
- WHEN they paste it into a Vue SFC in a Nextcloud app with the library installed
- THEN the template, script, and any style sections SHALL compile without errors assuming correct dependencies

#### Scenario: CnFormDialog usage example shows schema-driven form

- GIVEN a developer copies the CnFormDialog usage example
- WHEN they read the snippet
- THEN they SHALL see how to pass a JSON Schema, handle @confirm with form data, and optionally override individual fields via #field-{key} slots

#### Scenario: CnDashboardPage usage example shows widget registration

- GIVEN a developer copies the CnDashboardPage usage example
- WHEN they read the snippet
- THEN they SHALL see how to define widget definitions, a default layout, custom widget rendering via #widget-{id} slots, and layout persistence via @layout-change

### Requirement: Component Preview Screenshots

Each component page SHOULD include a screenshot or visual preview showing what the component looks like when rendered. Screenshots MUST be stored in `docs/assets/components/` and referenced with relative paths.

#### Scenario: CnDataTable has a visual preview

- GIVEN a developer visits the CnDataTable page
- WHEN they scroll past the description
- THEN they SHOULD see a screenshot showing the table with headers, rows, selection checkboxes, and pagination

#### Scenario: CnStatusBadge has variant previews

- GIVEN a developer visits the CnStatusBadge page
- WHEN they look at the visual preview
- THEN they SHOULD see examples of different status colors and text combinations

#### Scenario: Screenshots use consistent styling

- GIVEN a developer browses multiple component pages
- WHEN they compare screenshots
- THEN all screenshots SHOULD use the same Nextcloud theme and viewport width for visual consistency

### Requirement: Search and Filter Capability

The component reference index MUST support client-side search or filtering so developers can quickly find components by name or keyword. This MAY be implemented via Docusaurus search or a custom filter input on the index page.

#### Scenario: Developer searches by component name

- GIVEN a developer is on the component reference index
- WHEN they type "dialog" in the search or filter input
- THEN they SHALL see only dialog-related components (CnDeleteDialog, CnCopyDialog, CnFormDialog, CnAdvancedFormDialog, CnMassDeleteDialog, CnMassCopyDialog, CnMassExportDialog, CnMassImportDialog)

#### Scenario: Developer uses site-wide search

- GIVEN a developer uses the Docusaurus site search
- WHEN they search for "pagination"
- THEN they SHALL find the CnPagination component page and any other pages mentioning pagination

#### Scenario: Developer searches by feature keyword

- GIVEN a developer searches for "drag and drop"
- WHEN results appear
- THEN they SHALL find CnDashboardGrid documented as supporting drag-and-drop widget repositioning

### Requirement: Version Compatibility Notes

Each component page MUST include a "Since" version indicator showing which library version introduced the component. Components added after v1.0 MUST clearly state the minimum version required.

#### Scenario: New component shows version requirement

- GIVEN CnDashboardPage was added in a specific version
- WHEN a developer reads its page
- THEN they SHALL see a "Since: vX.Y.Z" note indicating when the component became available

#### Scenario: Original components show v1.0

- GIVEN CnDataTable has been available since the library's first release
- WHEN a developer reads its page
- THEN they SHALL see "Since: v1.0.0" or equivalent

#### Scenario: Breaking changes reference migration guide

- GIVEN a component's API changed between major versions
- WHEN a developer reads the version notes section
- THEN they SHALL find a link to the relevant migration guide explaining what changed and how to update

### Requirement: Accessibility Documentation

Each component page MUST include an accessibility section noting:
- WCAG AA compliance status (inherited from Nextcloud Vue primitives)
- Keyboard navigation support
- ARIA attributes used
- Screen reader behavior

#### Scenario: CnDataTable accessibility section

- GIVEN a developer reads the CnDataTable accessibility section
- WHEN they review the notes
- THEN they SHALL see that the table uses semantic HTML table elements, supports keyboard navigation for row selection, and inherits ARIA attributes from NcTable

#### Scenario: CnFormDialog accessibility section

- GIVEN a developer reads the CnFormDialog accessibility section
- WHEN they review the notes
- THEN they SHALL see that the dialog traps focus, uses aria-labelledby for the title, and supports Escape to close

#### Scenario: CnIcon accessibility section

- GIVEN a developer reads the CnIcon accessibility section
- WHEN they review the notes
- THEN they SHALL see guidance on when to use aria-hidden="true" (decorative icons) vs providing aria-label (meaningful icons)

### Requirement: Related Components Cross-References

Each component page MUST include a "Related Components" section linking to components commonly used together. This helps developers discover the composition patterns.

#### Scenario: CnDataTable links to related components

- GIVEN a developer reads the CnDataTable page
- WHEN they scroll to the Related Components section
- THEN they SHALL see links to CnCellRenderer, CnRowActions, CnPagination, CnFilterBar, and CnIndexPage (which composes CnDataTable)

#### Scenario: CnFormDialog links to related components

- GIVEN a developer reads the CnFormDialog page
- WHEN they scroll to the Related Components section
- THEN they SHALL see links to CnAdvancedFormDialog (richer alternative), CnIndexPage (parent that manages it), and CnDeleteDialog / CnCopyDialog (sibling dialogs)

#### Scenario: CnDashboardPage links to widget components

- GIVEN a developer reads the CnDashboardPage page
- WHEN they scroll to the Related Components section
- THEN they SHALL see links to CnDashboardGrid, CnWidgetWrapper, CnWidgetRenderer, CnTileWidget, CnChartWidget, and useDashboardView composable

## MODIFIED Requirements

_(none -- all new)_

## REMOVED Requirements

_(none -- all new)_

---

## Current Implementation Status

**Already implemented:**

- **Component Reference Index:** `docs/components/index.md` exists with components listed. 27 individual component pages exist in `docs/components/`:
  - cn-card-grid.md, cn-cell-renderer.md, cn-configuration-card.md, cn-copy-dialog.md, cn-data-table.md, cn-delete-dialog.md, cn-facet-sidebar.md, cn-filter-bar.md, cn-form-dialog.md, cn-icon.md, cn-index-page.md, cn-index-sidebar.md, cn-kpi-grid.md, cn-mass-action-bar.md, cn-mass-copy-dialog.md, cn-mass-delete-dialog.md, cn-mass-export-dialog.md, cn-mass-import-dialog.md, cn-object-card.md, cn-pagination.md, cn-register-mapping.md, cn-row-actions.md, cn-settings-card.md, cn-settings-section.md, cn-stats-block.md, cn-status-badge.md, cn-version-info-card.md

- **Store and Composable Reference:**
  - `docs/store/object-store.md` -- Documents `createObjectStore`, `useObjectStore`
  - `docs/store/plugins.md` -- Documents `auditTrailsPlugin`, `relationsPlugin`, `filesPlugin`, `lifecyclePlugin`, `registerMappingPlugin`, `createSubResourcePlugin`
  - `docs/utilities/composables/` -- Directory exists for composable documentation
  - `docs/utilities/index.md` -- Utility functions reference

**Source files for props verification:**
- All 42 components live in `src/components/Cn*/Cn*.vue`
- Store: `src/store/useObjectStore.js`, `src/store/createSubResourcePlugin.js`
- Store plugins: `src/store/plugins/auditTrails.js`, `relations.js`, `files.js`, `lifecycle.js`, `registerMapping.js`, `selection.js`, `search.js`
- Composables: `src/composables/useListView.js`, `useDetailView.js`, `useSubResource.js`, `useDashboardView.js`
- Utilities: `src/utils/schema.js`, `src/utils/headers.js`, `src/utils/errors.js`, `src/utils/id.js`

**Not yet implemented:**
- Dashboard components (CnDashboardPage, CnDashboardGrid, CnWidgetWrapper, CnWidgetRenderer, CnTileWidget, CnChartWidget) do NOT have individual doc pages
- CnTimelineStages, CnActionsBar, CnPageHeader, CnDetailCard, CnDetailPage, CnObjectSidebar, CnNotesCard, CnTasksCard, CnUserActionMenu do not have individual doc pages
- selectionPlugin and searchPlugin (with SEARCH_TYPE, getRegisterApiUrl, getSchemaApiUrl) are not documented in plugins.md
- useDashboardView composable is not documented
- Component screenshots/previews do not exist
- Version "Since" indicators are not present
- Accessibility sections are not present
- Related Components cross-references are not present
- The component categories in the index need updating to include all 42 components across 7 categories

## Standards & References

- **Props tables** must be derived from actual source code `props` definitions -- the spec explicitly forbids fabricated props
- **Nextcloud Vue Components** reference: https://nextcloud-vue-components.netlify.app/
- **Nextcloud Layout Components** reference: https://docs.nextcloud.com/server/stable/developer_manual/design/layoutcomponents.html
- **JSDoc** -- Source components have JSDoc on props which can be used to auto-generate docs
- **WCAG AA** -- Component docs should note accessibility features inherited from Nextcloud Vue
- **Vue 2 Options API** -- Primary API used by consumer apps; Composition API supported via composables

## Specificity Assessment

- **Specific enough?** Yes, the requirements cover component catalog structure (10 categories, 42 components), props/events/slots documentation format, code examples, screenshots, search, versioning, accessibility, and cross-references with concrete scenarios.
- **Missing/ambiguous:**
  - Auto-generation strategy (JSDoc-to-docs vs manual markdown) is not prescribed -- left to implementer
  - Internal-only components (used by CnIndexPage but not meant for direct use) documentation strategy is not specified
  - Screenshot capture tooling/process is not specified
- **Open questions:**
  - Should internal composition components (e.g., CnActionsBar used only inside CnIndexPage) be documented as "internal" with a warning?
  - Should the docs auto-generate from JSDoc annotations in the source Vue files?
