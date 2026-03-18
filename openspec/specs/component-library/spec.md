# Component Library — Core Conventions

## Purpose
Defines the foundational conventions all components in @conduction/nextcloud-vue MUST follow.

---

## Requirements

### REQ-CL-001: Component Naming and Structure

All components MUST follow the Cn-prefixed naming convention with barrel exports.

#### Scenario: Component directory structure

- GIVEN a new component named `CnMyComponent`
- THEN it MUST live in `src/components/CnMyComponent/CnMyComponent.vue`
- AND an `index.js` barrel MUST exist at `src/components/CnMyComponent/index.js`
- AND the barrel MUST re-export as `export { default as CnMyComponent } from './CnMyComponent.vue'`
- AND the component MUST be added to `src/components/index.js`
- AND the component MUST be added to `src/index.js`

### REQ-CL-002: Vue 2 Options API

All components MUST use Vue 2 Options API.

#### Scenario: Component structure

- GIVEN any component in the library
- THEN it MUST use `export default { name, components, props, data, computed, methods }`
- AND it MUST NOT use `<script setup>` or Composition API
- AND `name` MUST match the file name (e.g., `name: 'CnDataTable'`)

### REQ-CL-003: Backward Compatibility

Components MUST maintain backward compatibility across versions.

#### Scenario: Adding a new prop

- GIVEN an existing component
- WHEN a new prop is added
- THEN the prop MUST have a default value
- AND existing consumers MUST NOT break

#### Scenario: Removing a prop

- GIVEN an existing component with a prop
- WHEN the prop is no longer needed
- THEN it MUST be deprecated with `console.warn` (not removed)
- AND behavior MUST remain unchanged for consumers using the deprecated prop

### REQ-CL-004: CSS Conventions

All CSS classes MUST follow the library's naming and theming conventions.

#### Scenario: Class naming

- GIVEN any component CSS
- THEN all classes MUST use the `cn-` prefix (e.g., `cn-data-table__header`)

#### Scenario: Nextcloud-native theming

- GIVEN a CSS property that uses color or theming
- THEN it MUST use Nextcloud CSS variables (e.g., `var(--color-primary-element)`, `var(--color-border)`)
- AND MUST NOT reference `--nldesign-*` variables directly (the nldesign app overrides Nextcloud variables automatically)
- AND MUST NOT hardcode color values

### REQ-CL-005: Translation Support

Components MUST support pre-translated strings via props.

#### Scenario: Translatable labels

- GIVEN a component with user-visible text
- THEN all text MUST be configurable via props with English defaults
- AND components MUST NOT import `t()` from any specific app

### REQ-CL-006: JSDoc Documentation

All component interfaces MUST be documented with JSDoc.

#### Scenario: Component documentation

- GIVEN any component
- THEN every prop MUST have a JSDoc comment
- AND every emitted event MUST have an `@event` tag
- AND every public method MUST have `@public` and `@param` tags
- AND the component MUST have a module-level JSDoc with `@example`

---

### Current Implementation Status

**Already implemented:**

- **REQ-CL-001 (Naming/Structure):** All 38 components follow the `CnMyComponent/CnMyComponent.vue` + `index.js` barrel pattern. Each component is exported via `src/components/index.js` and `src/index.js`. Components: CnActionsBar, CnCardGrid, CnCellRenderer, CnChartWidget, CnConfigurationCard, CnCopyDialog, CnDashboardGrid, CnDashboardPage, CnDataTable, CnDeleteDialog, CnDetailCard, CnDetailPage, CnFacetSidebar, CnFilterBar, CnFormDialog, CnIcon, CnIndexPage, CnIndexSidebar, CnKpiGrid, CnMassActionBar, CnMassCopyDialog, CnMassDeleteDialog, CnMassExportDialog, CnMassImportDialog, CnObjectCard, CnObjectSidebar, CnPageHeader, CnPagination, CnRegisterMapping, CnRowActions, CnSettingsCard, CnSettingsSection, CnStatsBlock, CnStatusBadge, CnTileWidget, CnTimelineStages, CnVersionInfoCard, CnWidgetRenderer, CnWidgetWrapper.
- **REQ-CL-002 (Vue 2 Options API):** All components use `export default { name: '...', props, data, computed, methods }`. No `<script setup>` or Composition API used in components. `name` matches file name in all reviewed components.
- **REQ-CL-003 (Backward Compatibility):** All props have defaults. The composables (`useListView`, `useDetailView`) maintain backward compatibility with legacy API alongside new API — both are supported simultaneously via runtime detection.
- **REQ-CL-004 (CSS Conventions):** All CSS classes use `cn-` prefix (e.g., `cn-dashboard-grid`, `cn-dashboard-page__header`, `cn-data-table__header`). Theming uses Nextcloud CSS variables (`var(--color-primary-element)`, `var(--color-main-background)`, `var(--color-border)`, `var(--color-text-maxcontrast)`). No `--nldesign-*` references. No hardcoded colors.
- **REQ-CL-005 (Translation Support):** Components accept pre-translated strings via props with English defaults (e.g., CnDashboardPage: `editLabel: 'Edit'`, `doneLabel: 'Done'`, `emptyLabel: 'No widgets configured'`). No `t()` imports from specific apps.
- **REQ-CL-006 (JSDoc Documentation):** Key components and composables have JSDoc with `@example`, `@param`, and prop-level comments. Coverage varies — some components have full JSDoc, others have partial coverage.

**Key file paths:**
- `src/components/index.js` — Component barrel export
- `src/index.js` — Main library barrel (components + store + composables + utils)
- `src/css/index.css` — Global CSS module

**Not yet implemented:**
- JSDoc `@event` tags on all emitted events are not consistently present across all components
- JSDoc `@public` tags on public methods are not consistently present
- Module-level `@example` JSDoc is present on composables and some components but not all 38 components

### Standards & References

- **Vue 2 Options API** — Mandatory; no Composition API or `<script setup>` in component files
- **Nextcloud Vue (@nextcloud/vue)** — Base UI primitives (NcButton, NcDialog, NcAppContent, NcAppSidebar, NcEmptyContent, NcLoadingIcon, NcSelect, NcTextField, NcCheckboxRadioSwitch, NcNoteCard)
- **CSS BEM-like naming** — `cn-{component}__{element}--{modifier}` pattern
- **NL Design System** — Theming via CSS variable override chain (nldesign app sets Nextcloud variables)
- **WCAG AA** — Inherited from Nextcloud Vue base components

### Specificity Assessment

- **Specific enough?** Yes, the conventions are clear and implementable as-is.
- **Missing/ambiguous:**
  - No mention of the `registerIcons` utility function and its naming pattern — this is a key convention used across all consuming apps.
  - No requirement for component-level unit tests, though `tests/` directory exists with store and utils tests.
  - The spec does not mention the `CnIcon` component's extensible icon registry pattern, which is a core convention.
  - No specification for TypeScript type declarations (`src/types/`) or the constants module (`src/constants/`).
- **Open questions:**
  - Should the library migrate to Vue 3 Composition API in the future? The spec locks to Vue 2 Options API.
  - Are scoped styles (`<style scoped>`) or `:deep()` selectors an accepted convention? Both are used in existing components.
