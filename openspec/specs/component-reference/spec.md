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

1. **Description (hand-written)** — What the component does and when to use it
2. **Live Playground (auto-embedded)** — A `<Playground component="{name}" />` MDX element rendering the Vue Styleguidist iframe for the component (see `docs-site-infrastructure` Requirement: Live-demo Playground component)
3. **Reference (auto-generated)** — Imported via MDX from `docs/components/_generated/{name}.md`. The partial MUST contain props, events, and named slots, all derived from the SFC source by `vue-docgen-cli`. Empty sections (no events, no slots) MUST be suppressed in the partial output.
4. **Usage example (hand-written)** — A complete Vue SFC `<template>` snippet showing typical usage in context. May be omitted if the Playground demo already covers the same ground.
5. **Nextcloud relationship (hand-written)** — Which Nextcloud Vue primitive(s) it wraps or extends, with a link to the Nextcloud Vue Components documentation.

The hand-written sections (1, 4, 5) live in the `<name>.md` file at the top. The auto-generated section (3) lives in `_generated/<name>.md` and is rendered via `import GeneratedRef from './_generated/{Name}.md'` + `<GeneratedRef />`. Items 2 and 3 MUST be visually distinct (e.g. the Playground above an `## Reference (auto-generated)` heading) so a reader can scan to the type tables.

#### Scenario: Developer looks up CnIndexPage

- GIVEN a developer visits the CnIndexPage component page
- WHEN they read the page
- THEN they SHALL see a description, an interactive Playground iframe loading `/styleguide/#!/CnIndexPage`, an auto-generated Reference section below with props table (schema, objects, pagination, loading, selectable, viewMode, etc.), events table (@create, @edit, @delete, @copy, @refresh, @mass-*), slots table (#delete-dialog, #form-dialog, #field-\{key\}, etc.), a hand-written usage example, and a note explaining it composes CnActionsBar, CnDataTable, CnCardGrid, CnPagination and the dialog components

#### Scenario: Developer looks up CnIcon

- GIVEN a developer visits the CnIcon component page
- WHEN they read the page
- THEN they SHALL see (1) the hand-written `registerIcons()` pattern documented alongside (3) the auto-generated CnIcon props, the PascalCase resolution rule, and the HelpCircleOutline fallback explained as part of the hand-written description

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

All props tables MUST be **mechanically derived** from the actual component source code in `src/components/Cn*/Cn*.vue` by `vue-docgen-cli` at build time. Every prop listed in a component's `props` definition MUST appear in the generated partial; no props CAN be fabricated because the partial is reproducibly generated from source. Props inherited from Nextcloud Vue parent components are out of scope for the generator and MUST be noted separately in the hand-written description section if the inheritance is meaningful.

CI MUST fail any PR where regenerating `_generated/<name>.md` produces a diff against the committed file (see `docs-site-infrastructure` Requirement: Auto-generated component reference).

#### Scenario: Props match source code for CnDataTable

- GIVEN a developer compares `docs/components/_generated/CnDataTable.md` with `CnDataTable.vue`'s `props` definition
- WHEN they check each prop
- THEN every prop from the source MUST appear in the generated partial with its declared type, default, and JSDoc-derived description, and no extra props SHALL be listed

#### Scenario: Props match source code for CnFormDialog

- GIVEN a developer compares `docs/components/_generated/CnFormDialog.md` with `CnFormDialog.vue`'s `props` definition
- WHEN they check each prop
- THEN every prop from the source MUST appear in the generated partial including schema, item, title, confirmLabel, and any slot-related props

#### Scenario: Deprecated props are marked

- GIVEN a component declares a prop with `@deprecated` JSDoc and a `console.warn` runtime check
- WHEN `vue-docgen-cli` generates the partial
- THEN the prop entry MUST include a "Deprecated" marker and the @deprecated message verbatim

#### Scenario: Stale partial fails CI

- GIVEN a contributor adds a prop to `CnFormDialog.vue` but does not regenerate the partial
- WHEN CI runs `npm run prebuild:docs && git diff --exit-code docs/components/_generated/`
- THEN the job MUST fail with the missing prop visible in the diff

### Requirement: Events Documentation

Each component that emits events MUST have its events documented in the auto-generated partial, with each event's name, payload type/shape (from JSDoc `@property` or TypeScript types), and description (from JSDoc above the `$emit` call or `emits:` declaration). Events emitted by child components that bubble up (e.g., CnIndexPage re-emitting CnDataTable events) MUST be documented on the parent component page — either via the parent's `emits:` declaration (preferred — `vue-docgen-cli` will pick them up) or, if the parent re-emits without declaring, in the hand-written narrative.

#### Scenario: CnIndexPage event documentation is complete

- GIVEN a developer reads the CnIndexPage events table in `_generated/CnIndexPage.md`
- WHEN they review the events
- THEN they SHALL find @create, @edit, @delete, @copy, @refresh, @mass-*, @sort, @page-change, @filter-change, @search, and @row-click documented with payload shapes derived from JSDoc

#### Scenario: Two-phase dialog events are explained

- GIVEN a developer reads CnDeleteDialog
- WHEN they review the confirm event
- THEN the auto-generated table MUST list `@confirm` with its payload, AND the hand-written description above MUST explain the two-phase pattern: @confirm fires when the user clicks confirm, then the parent calls setDeleteResult() to close the dialog with success/error state

#### Scenario: Developer understands event payload

- GIVEN a developer reads the @mass-export event entry in the auto-generated partial
- WHEN they look at the payload column
- THEN the JSDoc-declared payload shape MUST appear (selected ids array + format string)

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

### Requirement: JSDoc completeness ratchet — "components update → docs update automatically"

The library MUST guarantee that documentation tracks component source automatically. This depends on three CI-enforced guarantees working together:

**G1 — Freshness:** the committed `docs/components/_generated/<name>.md` partial MUST match what `vue-docgen-cli` produces from current source. CI MUST run `npm run prebuild:docs && git diff --exit-code docs/components/_generated/` and fail any PR with a non-empty diff. This forces every prop / event / slot change to ship with its regenerated partial.

**G2 — Completeness:** the JSDoc on each `Cn*` SFC MUST be rich enough that the generated partial is genuinely useful. A `scripts/check-jsdoc.js` CI step MUST score each component:

| Item | Required JSDoc to count as "documented" |
|---|---|
| Prop | A non-empty leading `/** ... */` block above the prop's `props:` entry. For non-trivial types, an `@type {...}` tag. |
| Event | An `@event eventName Description` JSDoc tag at the `$emit` site, with an `@type {...}` describing the payload shape. Single-payload events MAY use `@property` style. |
| Named slot | A JSDoc `@slot name description` (or `<!-- @slot ... -->` template comment) above the `<slot name="...">`. Scoped slots additionally require `@binding {Type} key description` for each scope key. |

For each component the script computes `score = documented / total`, and compares against the per-component baseline committed at `scripts/.jsdoc-baselines.json`. The build MUST fail if any component's score regresses below its baseline. New components (no baseline entry) MUST score 100% to pass.

The baseline file MUST be regenerated by running `npm run jsdoc-baselines:update` on a clean tree. Each PR that improves a component's JSDoc MUST commit the bumped baseline alongside.

**G3 — Discoverability:** authors MUST learn the convention before — not after — opening a PR. The library MUST ship:

- A reference in [CLAUDE.md](../../../CLAUDE.md) under "Documenting components" describing the three required JSDoc shapes (prop, event, slot) with one canonical example each.
- The `check-jsdoc.js` failure message MUST cite the component, the missing items by name, and the SFC line numbers — so the author fixes by jumping to the line, not by guessing.
- A `scripts/new-component.js` scaffolder SHOULD write a fresh `Cn*` skeleton with the required JSDoc shells (description, props with `/** ... */` placeholders, `@event` / `@slot` tags) so new components start at 100%. (Optional convenience layer; not load-bearing — CI is the enforcement.)

#### Scenario: Adding a prop without JSDoc fails CI

- GIVEN a developer adds a new prop to `CnDataTable.vue` without a `/** ... */` JSDoc block above it
- WHEN they run `git push` and CI executes the `Frontend Quality` workflow
- THEN `scripts/check-jsdoc.js` MUST fail the build with a message naming the prop, the file path, and the line number, AND the build MUST NOT proceed to deploy

#### Scenario: Improving JSDoc bumps the baseline

- GIVEN a developer adds a missing description to an existing prop
- WHEN they run `npm run jsdoc-baselines:update && git diff scripts/.jsdoc-baselines.json`
- THEN the baseline file MUST show that component's score increased
- AND the developer MUST commit the bumped baseline so a future regression below this new bar is caught

#### Scenario: New component ships at 100%

- GIVEN a developer adds `src/components/CnNewWidget/CnNewWidget.vue` (with no entry in `.jsdoc-baselines.json`)
- WHEN CI runs `check-jsdoc.js`
- THEN the component MUST score 100% (every prop / event / slot fully documented) or the build MUST fail with a list of missing JSDoc

#### Scenario: Author learns the convention before opening a PR

- GIVEN a developer is asked to add a new `Cn*` component
- WHEN they read CLAUDE.md "Documenting components"
- THEN the three required JSDoc shapes (prop, event, slot) MUST be documented with one canonical example each, so the author can copy-paste the pattern before starting

### Requirement: Auto-regeneration on commit (developer ergonomics)

The library SHOULD ship a pre-commit hook (e.g. via `husky` or `simple-git-hooks`) that runs `npm run prebuild:docs` whenever a `src/components/Cn*/Cn*.vue` file changes in the staged set, and stages the regenerated partial. This makes the freshness guarantee (G1) automatic at commit time so authors don't have to remember.

The hook MUST be opt-in friendly: a developer who runs `npm run prebuild:docs` manually before committing MUST get the same result without double work. CI is the load-bearing enforcement; the hook is a convenience.

#### Scenario: Editing a SFC auto-regenerates its partial on commit

- GIVEN a developer adds a prop to `CnDataTable.vue` and stages only the SFC (`git add src/components/CnDataTable/CnDataTable.vue`)
- WHEN they run `git commit -m "..."`
- THEN the pre-commit hook SHOULD run `prebuild:docs`, regenerate `docs/components/_generated/CnDataTable.md`, and stage it
- AND the resulting commit SHOULD include both the SFC change and the regenerated partial

## MODIFIED Requirements

The following requirements were modified by the **unify-component-docs** change (archived 2026-05-09):

- **Individual Component Pages** — Each page now has a hand-written narrative + auto-embedded `<Playground />` + auto-generated `## Reference (auto-generated)` partial structure, replacing the previous all-hand-written prop/event/slot tables.
- **Props Documentation Accuracy** — Tables are now mechanically derived from SFC source via `vue-docgen-cli`; CI fails on any drift.
- **Events Documentation** — Events come from JSDoc above `$emit` calls or `emits:` declarations; auto-generated.

## REMOVED Requirements

_(none)_

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
