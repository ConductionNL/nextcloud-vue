---
status: reviewed
---

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

#### Scenario: Removing an event or slot

- GIVEN an existing component with an emitted event or named slot
- WHEN the event or slot is no longer needed
- THEN it MUST NOT be removed in a minor or patch release
- AND a deprecation warning MUST be logged when the event listener or slot content is detected

### REQ-CL-004: CSS Conventions

All CSS classes MUST follow the library's naming and theming conventions.

#### Scenario: Class naming

- GIVEN any component CSS
- THEN all classes MUST use the `cn-` prefix (e.g., `cn-data-table__header`)
- AND classes MUST follow BEM-like naming: `cn-{component}__{element}--{modifier}`

#### Scenario: Nextcloud-native theming

- GIVEN a CSS property that uses color or theming
- THEN it MUST use Nextcloud CSS variables (e.g., `var(--color-primary-element)`, `var(--color-border)`)
- AND MUST NOT reference `--nldesign-*` variables directly (the nldesign app overrides Nextcloud variables automatically)
- AND MUST NOT hardcode color values

#### Scenario: Scoped styles

- GIVEN a component with `<style>` blocks
- THEN scoped styles (`<style scoped>`) and `:deep()` selectors are permitted
- AND global styles MUST use the `cn-` prefix to avoid collisions with Nextcloud or consumer CSS

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

## ADDED Requirements

### REQ-CL-007: Barrel Export Chain

The library MUST maintain a three-level barrel export chain so that consumers can import from the package root.

#### Scenario: Three-level barrel re-export

- GIVEN the library source structure
- THEN each component directory MUST have an `index.js` that re-exports the default export as a named export (e.g., `export { default as CnDataTable } from './CnDataTable.vue'`)
- AND `src/components/index.js` MUST re-export every component from its directory barrel (e.g., `export { CnDataTable } from './CnDataTable/index.js'`)
- AND `src/index.js` MUST re-export all components from `src/components/index.js`
- AND `src/index.js` MUST also re-export stores, composables, and utilities from their respective barrels

#### Scenario: Non-component exports from component barrels

- GIVEN a component barrel that exports additional symbols (e.g., `CnIcon/index.js` exports `ICON_MAP` and `registerIcons`)
- THEN those symbols MUST also be re-exported through `src/components/index.js`
- AND they MUST be re-exported through `src/index.js` so consumers can import them from the package root

#### Scenario: Consumer import pattern

- GIVEN a consumer app importing from the library
- THEN `import { CnDataTable, CnPagination } from '@conduction/nextcloud-vue'` MUST resolve to the correct components
- AND `import { useObjectStore, createObjectStore } from '@conduction/nextcloud-vue'` MUST resolve to the correct store functions
- AND `import { useListView, useDetailView } from '@conduction/nextcloud-vue'` MUST resolve to the correct composables

### REQ-CL-008: Rollup Build Output

The library MUST produce dual-format builds with extracted CSS via Rollup.

#### Scenario: ESM output

- GIVEN a production build via `npm run build`
- THEN the build MUST produce `dist/nextcloud-vue.esm.js` in ES module format
- AND the `module` field in `package.json` MUST point to this file
- AND source maps MUST be generated alongside the ESM bundle

#### Scenario: CJS output

- GIVEN a production build via `npm run build`
- THEN the build MUST produce `dist/nextcloud-vue.cjs.js` in CommonJS format
- AND the `main` field in `package.json` MUST point to this file
- AND source maps MUST be generated alongside the CJS bundle

#### Scenario: CSS extraction

- GIVEN components with `<style>` blocks
- THEN Rollup MUST extract all CSS into a single `dist/nextcloud-vue.css` file
- AND the `style` field in `package.json` MUST point to this file
- AND Vue SFC styles MUST NOT be inlined into the JS bundle (rollup-plugin-vue `css: false`)

### REQ-CL-009: Tree-Shaking and External Dependencies

The build MUST support tree-shaking and correctly externalize peer dependencies.

#### Scenario: External peer dependencies

- GIVEN the Rollup configuration
- THEN `vue` MUST be marked as external
- AND all `@nextcloud/*` packages MUST be marked as external (via regex `/^@nextcloud\//`)
- AND `pinia` MUST be marked as external
- AND `vue-material-design-icons/*` MUST be marked as external (via regex)
- AND none of these MUST be bundled into the output

#### Scenario: Tree-shakable named exports

- GIVEN the library uses named exports throughout the barrel chain
- THEN consumers using a bundler (e.g., Webpack) MUST be able to tree-shake unused components
- AND `src/index.js` MUST use only named `export { ... } from '...'` syntax (no `export default`)

### REQ-CL-010: Peer Dependency Management

The library MUST declare peer dependencies for all host-provided packages.

#### Scenario: Required peer dependencies

- GIVEN the library's `package.json`
- THEN `vue` MUST be a peer dependency at `^2.7.0`
- AND `pinia` MUST be a peer dependency at `^2.0.0`
- AND `@nextcloud/vue` MUST be a peer dependency at `^8.0.0`
- AND `@nextcloud/axios` MUST be a peer dependency at `^2.0.0`
- AND `@nextcloud/router` MUST be a peer dependency
- AND `@nextcloud/l10n` MUST be a peer dependency
- AND `vue-material-design-icons` MUST be a peer dependency

#### Scenario: Peer dependencies not bundled

- GIVEN a dependency listed as `peerDependencies`
- THEN it MUST also appear in the Rollup `external` configuration
- AND it MUST NOT appear in `dependencies` (only in `peerDependencies` and optionally `devDependencies` for local development)

### REQ-CL-011: Cn Prefix Naming Convention

All public symbols exported by the library MUST follow a consistent naming convention.

#### Scenario: Component names

- GIVEN any Vue component in the library
- THEN its name MUST start with `Cn` followed by PascalCase (e.g., `CnDataTable`, `CnFormDialog`)
- AND the directory name MUST match the component name exactly
- AND the `.vue` file name MUST match the component name exactly

#### Scenario: Utility and composable names

- GIVEN utility functions and composables
- THEN composables MUST use `use` prefix with camelCase (e.g., `useListView`, `useDetailView`)
- AND store factories MUST use descriptive camelCase (e.g., `createObjectStore`, `useObjectStore`)
- AND utility functions MUST use camelCase (e.g., `buildHeaders`, `columnsFromSchema`)

#### Scenario: CSS class names

- GIVEN any CSS class in any component
- THEN it MUST start with the `cn-` prefix
- AND use kebab-case after the prefix (e.g., `cn-data-table`, `cn-form-dialog__footer`)
- AND MUST NOT use unprefixed class names that could collide with Nextcloud or consumer styles

### REQ-CL-012: Icon Registry Pattern

The `CnIcon` component MUST provide an extensible icon registry for consumer apps.

#### Scenario: Default icon map

- GIVEN the `CnIcon` component
- THEN it MUST export an `ICON_MAP` constant containing default icon name-to-component mappings
- AND the `ICON_MAP` MUST be importable from the package root

#### Scenario: Consumer icon registration

- GIVEN a consumer app that needs additional icons
- THEN the library MUST export a `registerIcons(iconMap)` function
- AND calling `registerIcons({ myIcon: MyIconComponent })` MUST extend the available icon set
- AND previously registered icons MUST NOT be removed when new icons are registered

#### Scenario: Icon rendering

- GIVEN a `CnIcon` component instance with a `name` prop
- WHEN the name matches a registered icon
- THEN the corresponding icon component MUST be rendered
- AND when the name does not match, the component MUST fail gracefully (no error thrown)

### REQ-CL-013: Test Coverage for Components

Components MUST have test coverage to prevent regressions.

#### Scenario: Test file location

- GIVEN a component `CnMyComponent`
- THEN a test file SHOULD exist at `tests/components/CnMyComponent.spec.js`
- AND tests MUST use Jest with `@vue/test-utils` v1 (Vue 2 compatible)

#### Scenario: Test scope

- GIVEN a component test
- THEN it MUST verify that the component renders without errors with default props
- AND it MUST verify that required props produce the expected output
- AND it MUST verify that emitted events fire with correct payloads
- AND it MUST verify that slot content is rendered correctly when applicable

#### Scenario: Running tests

- GIVEN the library source
- WHEN `npm test` is executed
- THEN all tests in `tests/` MUST pass
- AND the test runner MUST be configured via Jest (`jest` in `package.json` scripts)

### REQ-CL-014: CSS Auto-Import

The library MUST auto-import global CSS when the JS entry point is imported.

#### Scenario: Global CSS side effect

- GIVEN `src/index.js`
- THEN it MUST contain `import './css/index.css'` at the top of the file
- AND `package.json` MUST set `"sideEffects": true` so that bundlers do not tree-shake away the CSS import

#### Scenario: Consumer CSS availability

- GIVEN a consumer app that imports any symbol from `@conduction/nextcloud-vue`
- THEN the global CSS from `src/css/index.css` MUST be included in the consumer's build output
- AND the extracted CSS bundle MUST be available at `dist/nextcloud-vue.css` for consumers who prefer manual CSS import

### REQ-CL-015: Package Distribution

The published package MUST include both source and built files.

#### Scenario: Package files field

- GIVEN the `package.json` `files` field
- THEN it MUST include `dist/` (built output)
- AND it MUST include `src/` (source files for development and debugging)
- AND it MUST include `css/` if global CSS files exist outside `src/`

#### Scenario: Package entry points

- GIVEN the `package.json`
- THEN `main` MUST point to `dist/nextcloud-vue.cjs.js` (CJS entry for Node/require)
- AND `module` MUST point to `dist/nextcloud-vue.esm.js` (ESM entry for bundlers)
- AND `style` MUST point to `dist/nextcloud-vue.css` (CSS entry for style loaders)
- AND `types` MUST point to a TypeScript declaration file (e.g., `src/types/index.d.ts`)

#### Scenario: Prepare and publish hooks

- GIVEN the `package.json` scripts
- THEN `prepare` MUST run the build so that `npm install` from git produces dist files
- AND `prepublishOnly` MUST run the build so that `npm publish` always ships fresh artifacts

---

## Current Implementation Status

**Already implemented:**

- **REQ-CL-001 (Naming/Structure):** All 41 components follow the `CnMyComponent/CnMyComponent.vue` + `index.js` barrel pattern. Each component is exported via `src/components/index.js` and `src/index.js`. Components: CnActionsBar, CnAdvancedFormDialog, CnCardGrid, CnCellRenderer, CnConfigurationCard, CnCopyDialog, CnDashboardGrid, CnDashboardPage, CnDataTable, CnDeleteDialog, CnDetailCard, CnDetailPage, CnFacetSidebar, CnFilterBar, CnFormDialog, CnIcon, CnIndexPage, CnIndexSidebar, CnKpiGrid, CnMassActionBar, CnMassCopyDialog, CnMassDeleteDialog, CnMassExportDialog, CnMassImportDialog, CnNotesCard, CnObjectCard, CnPageHeader, CnPagination, CnRegisterMapping, CnRowActions, CnSettingsCard, CnSettingsSection, CnStatsBlock, CnStatusBadge, CnTasksCard, CnTileWidget, CnTimelineStages, CnUserActionMenu, CnVersionInfoCard, CnWidgetRenderer, CnWidgetWrapper.
- **REQ-CL-002 (Vue 2 Options API):** All components use `export default { name: '...', props, data, computed, methods }`. No `<script setup>` or Composition API used in components. `name` matches file name in all reviewed components.
- **REQ-CL-003 (Backward Compatibility):** All props have defaults. The composables (`useListView`, `useDetailView`) maintain backward compatibility with legacy API alongside new API — both are supported simultaneously via runtime detection. Events and slots are never removed.
- **REQ-CL-004 (CSS Conventions):** All CSS classes use `cn-` prefix (e.g., `cn-dashboard-grid`, `cn-dashboard-page__header`, `cn-data-table__header`). Theming uses Nextcloud CSS variables (`var(--color-primary-element)`, `var(--color-main-background)`, `var(--color-border)`, `var(--color-text-maxcontrast)`). No `--nldesign-*` references. No hardcoded colors. Both scoped and global styles use `cn-` prefix.
- **REQ-CL-005 (Translation Support):** Components accept pre-translated strings via props with English defaults (e.g., CnDashboardPage: `editLabel: 'Edit'`, `doneLabel: 'Done'`, `emptyLabel: 'No widgets configured'`). No `t()` imports from specific apps.
- **REQ-CL-006 (JSDoc Documentation):** Key components and composables have JSDoc with `@example`, `@param`, and prop-level comments. Coverage varies — some components have full JSDoc, others have partial coverage.
- **REQ-CL-007 (Barrel Export Chain):** Three-level barrel chain is fully implemented. Component barrels re-export named exports, `src/components/index.js` aggregates all component barrels, and `src/index.js` re-exports components plus stores, composables, and utilities. `registerIcons` and `ICON_MAP` are re-exported through the full chain.
- **REQ-CL-008 (Rollup Build Output):** Rollup config produces ESM (`dist/nextcloud-vue.esm.js`) and CJS (`dist/nextcloud-vue.cjs.js`) with source maps. CSS is extracted to `dist/nextcloud-vue.css` via `rollup-plugin-postcss`. Vue SFC styles use `css: false` to prevent JS inlining.
- **REQ-CL-009 (Tree-Shaking):** `vue`, `@nextcloud/*`, `pinia`, and `vue-material-design-icons/*` are all externalized via Rollup's `external` array. All exports use named export syntax throughout the barrel chain.
- **REQ-CL-010 (Peer Dependencies):** All required peer dependencies are declared: `vue ^2.7.0`, `pinia ^2.0.0`, `@nextcloud/vue ^8.0.0`, `@nextcloud/axios ^2.0.0`, `@nextcloud/router`, `@nextcloud/l10n`, `vue-material-design-icons ^5.0.0`, `bootstrap-vue ^2.23.1`. All peer deps are also in `devDependencies` for local development.
- **REQ-CL-011 (Cn Prefix Convention):** All components use `Cn` prefix with PascalCase. Directory, file, and `name` property all match. Composables use `use` prefix. Utilities use camelCase. CSS classes use `cn-` kebab-case prefix.
- **REQ-CL-012 (Icon Registry):** `CnIcon` exports `ICON_MAP` and `registerIcons()`. Both are re-exported through the barrel chain. Consumer apps call `registerIcons()` to extend the icon set.
- **REQ-CL-014 (CSS Auto-Import):** `src/index.js` imports `./css/index.css` at the top. `package.json` has `"sideEffects": true`.
- **REQ-CL-015 (Package Distribution):** `files` includes `dist/`, `src/`, `css/`. Entry points: `main` -> CJS, `module` -> ESM, `style` -> CSS, `types` -> `src/types/index.d.ts`. Both `prepare` and `prepublishOnly` scripts run the build.

**Partially implemented:**

- **REQ-CL-013 (Test Coverage):** Tests exist for the store (`useObjectStore.spec.js`), utilities (`schema.spec.js`, `headers.spec.js`, `errors.spec.js`), and one component (`CnAdvancedFormDialog.spec.js`). Most components (40 of 41) do not yet have dedicated test files. The Jest + `@vue/test-utils` v1 infrastructure is configured and working.

**Not yet implemented:**

- JSDoc `@event` tags on all emitted events are not consistently present across all components
- JSDoc `@public` tags on public methods are not consistently present
- Module-level `@example` JSDoc is present on composables and some components but not all 41 components
- Component-level test files for 40 of 41 components

## Standards & References

- **Vue 2 Options API** — Mandatory; no Composition API or `<script setup>` in component files
- **Nextcloud Vue (@nextcloud/vue)** — Base UI primitives (NcButton, NcDialog, NcAppContent, NcAppSidebar, NcEmptyContent, NcLoadingIcon, NcSelect, NcTextField, NcCheckboxRadioSwitch, NcNoteCard)
- **CSS BEM-like naming** — `cn-{component}__{element}--{modifier}` pattern
- **NL Design System** — Theming via CSS variable override chain (nldesign app sets Nextcloud variables)
- **WCAG AA** — Inherited from Nextcloud Vue base components
- **Rollup 3** — Build toolchain with vue, postcss, node-resolve, commonjs plugins

## Specificity Assessment

- **Specific enough?** Yes, the conventions and build requirements are clear and implementable as-is.
- **Missing/ambiguous:**
  - No specification for TypeScript type declarations (`src/types/`) or the constants module (`src/constants/`).
  - No requirement for minimum test coverage percentage — only that tests should exist.
  - The spec does not prescribe a changelog or versioning strategy (semver is assumed but not specified).
- **Open questions:**
  - Should the library migrate to Vue 3 Composition API in the future? The spec locks to Vue 2 Options API.
  - Are scoped styles (`<style scoped>`) or `:deep()` selectors an accepted convention? Both are used in existing components and are now documented as permitted in REQ-CL-004.
  - Should `bootstrap-vue` remain a peer dependency long-term, or should it be phased out?
