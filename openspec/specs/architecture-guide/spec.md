# architecture-guide Specification

## Purpose

Explains the design philosophy and layered architecture of `@conduction/nextcloud-vue` — how it builds on Nextcloud's own component system to provide higher-level, schema-driven page patterns. This specification also defines the project structure, build pipeline, coding conventions, dependency management, and consumer integration rules that govern the library.

## Requirements

### Requirement: Architecture Overview Page

The docs site MUST include a `docs/architecture/overview.md` page with a Mermaid diagram showing the three-layer relationship:

```
Layer 3: App (LarpingApp, Pipelinq, OpenCatalogi, Procest, MyDash, ...)
Layer 2: @conduction/nextcloud-vue (Cn* components, createObjectStore, composables)
Layer 1: Nextcloud Vue (@nextcloud/vue — NcAppNavigation, NcAppContent, NcAppSidebar, NcButton, NcDialog, ...)
```

The page MUST explain:
- **Layer 1** is Nextcloud's official component library — layout primitives and UI building blocks. Link to [Nextcloud Layout Components](https://docs.nextcloud.com/server/stable/developer_manual/design/layoutcomponents.html) and [Nextcloud Vue Components](https://nextcloud-vue-components.netlify.app/).
- **Layer 2** (`@conduction/nextcloud-vue`) composes these primitives into opinionated, schema-driven page patterns. It does NOT replace Layer 1 — it adds higher-level abstractions on top.
- **Layer 3** is the individual Nextcloud app, which uses both layers. Apps import Cn* components for page structure and can still use Nc* components directly for custom UI.

#### Scenario: Developer understands the layers

- GIVEN a developer reads the architecture overview
- WHEN they look at the diagram and explanations
- THEN they understand that CnIndexPage wraps NcAppContent, CnIndexSidebar wraps NcAppSidebar, MainMenu uses NcAppNavigation, and apps can mix both component sets

### Requirement: Component Mapping Table

The architecture overview MUST include a mapping table showing how Cn* components relate to Nc* primitives:

| @conduction/nextcloud-vue | Wraps | Purpose |
|---------------------------|-------|---------|
| CnIndexPage | NcAppContent | Schema-driven list page with table, filters, pagination |
| CnIndexSidebar | NcAppSidebar | Detail sidebar with tabs, driven by object data |
| CnFacetSidebar | NcAppSidebar | Faceted search sidebar with filter chips |
| CnDataTable | NcListItems (concept) | Sortable data table with column config from schema |
| CnDeleteDialog | NcDialog | Confirmation dialog for object deletion |
| CnFormDialog | NcDialog | Form dialog for object creation/editing |
| MainMenu (app-level) | NcAppNavigation | Router-linked navigation menu |

#### Scenario: Developer finds the Nextcloud equivalent

- GIVEN a developer is familiar with Nextcloud Vue's NcAppSidebar
- WHEN they look at the mapping table
- THEN they see that CnIndexSidebar builds on NcAppSidebar and understand the relationship

### Requirement: Schema-Driven Pattern Documentation

The docs MUST include a `docs/architecture/schema-driven.md` page explaining the schema-driven approach:
- How OpenRegister schemas define entity structure (properties, types, facets)
- How `createObjectStore` uses schemas to auto-configure CRUD operations
- How `columnsFromSchema`, `filtersFromSchema`, `fieldsFromSchema` extract table columns, filter options, and form fields from a schema
- How `CnIndexPage` and `CnDataTable` use this to render without manual column/filter configuration

#### Scenario: Developer understands schema-driven rendering

- GIVEN a developer reads the schema-driven pattern page
- WHEN they follow the flow from schema definition through to rendered table
- THEN they understand that defining a schema with properties automatically gives them a working list page with columns, filters, and CRUD

### Requirement: Store Architecture Documentation

The docs MUST include a `docs/architecture/store.md` page explaining:
- The `createObjectStore` factory pattern — one store factory, multiple registered types
- The plugin system — how `auditTrailsPlugin`, `relationsPlugin`, `filesPlugin`, `lifecyclePlugin`, `registerMappingPlugin`, `selectionPlugin`, and `searchPlugin` extend the store
- The `createSubResourcePlugin` pattern for child resources
- How `initializeStores()` at app boot fetches settings and registers object types

#### Scenario: Developer understands store setup

- GIVEN a developer reads the store architecture page
- WHEN they see the createObjectStore pattern with plugins
- THEN they understand how to set up a new object type with CRUD, file attachments, audit trails, and relation management

### Requirement: Links to Nextcloud Documentation

Every architecture page MUST include contextual links to the relevant Nextcloud developer documentation:
- [Nextcloud Layout Components](https://docs.nextcloud.com/server/stable/developer_manual/design/layoutcomponents.html) — for understanding the base layout primitives
- [Nextcloud Vue Components](https://nextcloud-vue-components.netlify.app/) — for the full Nc* component API reference
- [Nextcloud App Development](https://docs.nextcloud.com/server/stable/developer_manual/app_development/index.html) — for general app development context

These links SHALL be placed in context (not just a link dump) — each reference MUST explain what the linked resource covers and why the reader should visit it.

#### Scenario: Developer follows link to Nextcloud docs

- GIVEN a developer is reading about CnIndexPage wrapping NcAppContent
- WHEN they see the contextual link to Nextcloud Layout Components
- THEN the link text explains "See NcAppContent in the Nextcloud Layout Components guide for the underlying primitive's API"

### Requirement: Project Structure Convention

The `src/` directory MUST follow the established directory layout. Each directory has a single responsibility:

- `src/components/` — Vue SFC components, each in its own `CnPrefixed/` subdirectory containing the `.vue` file and an `index.js` re-export
- `src/store/` — Pinia store factory (`useObjectStore.js`), sub-resource plugin factory (`createSubResourcePlugin.js`), and a `plugins/` subdirectory for store plugins
- `src/composables/` — Vue composables (`useListView.js`, `useDetailView.js`, `useSubResource.js`, `useDashboardView.js`) that encapsulate reusable stateful logic
- `src/css/` — Global CSS modules (separate files per concern: `table.css`, `badge.css`, `pagination.css`, `dashboard.css`, etc.) with `index.css` as the aggregating entry point
- `src/utils/` — Pure utility functions (`schema.js`, `headers.js`, `errors.js`, `id.js`) with no Vue reactivity or side effects
- `src/types/` — TypeScript declaration files (`.d.ts`) for type hints consumed by IDEs and TypeScript-aware consumers
- `src/constants/` — Shared constant values used across the library (e.g., `metadata.js`)
- `src/index.js` — Main barrel export that re-exports all public API surface

New files MUST be placed in the appropriate directory. New components MUST follow the `CnPrefixed/` subdirectory pattern.

#### Scenario: Developer adds a new component

- GIVEN a developer needs to add CnTimelineWidget
- WHEN they create the component
- THEN they create `src/components/CnTimelineWidget/CnTimelineWidget.vue` and `src/components/CnTimelineWidget/index.js`, add it to `src/components/index.js`, and add it to `src/index.js`

#### Scenario: Developer adds a new utility

- GIVEN a developer needs to add a date formatting utility
- WHEN they create the file
- THEN they place it at `src/utils/date.js`, export it from `src/utils/index.js`, and re-export it from `src/index.js`

### Requirement: Barrel Export Pattern

All public API surface MUST be exported through the main barrel at `src/index.js`. Each subdirectory (`components/`, `store/`, `composables/`, `utils/`) MUST have its own `index.js` that aggregates exports from its children. The main barrel re-exports from these subdirectory barrels.

Consumers MUST be able to import any public component, store, composable, or utility from the package root:

```js
import { CnDataTable, useObjectStore, useListView, columnsFromSchema } from '@conduction/nextcloud-vue'
```

Internal implementation details that are NOT exported from the barrel are considered private and MAY change without notice.

#### Scenario: Consumer imports from barrel

- GIVEN a consumer app needs CnDataTable and useObjectStore
- WHEN they write their import statement
- THEN `import { CnDataTable, useObjectStore } from '@conduction/nextcloud-vue'` resolves correctly because both are exported from `src/index.js`

#### Scenario: New export added to barrel

- GIVEN a developer adds a new public composable `useFileSelection`
- WHEN the composable is ready for consumption
- THEN it MUST be added to `src/composables/index.js` AND to `src/index.js` before the change is published

### Requirement: Rollup Build Pipeline

The library MUST be built using Rollup with the following output formats:
- **ESM** — `dist/nextcloud-vue.esm.js` (for modern bundlers, referenced by `module` field in package.json)
- **CJS** — `dist/nextcloud-vue.cjs.js` (for Node.js/CommonJS consumers, referenced by `main` field in package.json)
- **CSS** — `dist/nextcloud-vue.css` (extracted styles, referenced by `style` field in package.json)

All three outputs MUST be generated by a single `rollup -c` invocation. Source maps MUST be enabled for both JS outputs.

The build MUST externalize the following dependencies (they are NOT bundled into the output):
- `vue` — provided by the Nextcloud runtime
- `@nextcloud/*` — all Nextcloud packages (axios, router, l10n, vue, etc.)
- `pinia` — state management, provided by the consumer
- `vue-material-design-icons/*` — icon components, provided by the consumer

The `prepare` and `prepublishOnly` scripts MUST both run the build to ensure `dist/` is always fresh on publish.

#### Scenario: Build produces correct outputs

- GIVEN a developer runs `npm run build`
- WHEN Rollup completes
- THEN `dist/nextcloud-vue.esm.js`, `dist/nextcloud-vue.cjs.js`, and `dist/nextcloud-vue.css` all exist with source maps

#### Scenario: External dependencies are not bundled

- GIVEN the library imports `@nextcloud/vue` components
- WHEN the build runs
- THEN `@nextcloud/vue` code is NOT included in the output bundle — it remains an external import reference

### Requirement: Vue 2.7 Options API

All components MUST use Vue 2.7 Options API (`export default { name, props, data, computed, methods, ... }`). The Composition API (`<script setup>`, `setup()` function) MUST NOT be used in component definitions.

Composables in `src/composables/` MAY use Vue 2.7's Composition API internally (since they are not component definitions), but component `.vue` files MUST use Options API exclusively.

This constraint exists because consumer apps run on Vue 2.7 within the Nextcloud runtime, and Options API provides a consistent, well-understood pattern across all Conduction apps.

#### Scenario: Component uses Options API

- GIVEN a developer creates a new CnWidget component
- WHEN they write the `<script>` block
- THEN it uses `export default { name: 'CnWidget', props: {...}, data() {...}, methods: {...} }` and NOT `<script setup>` or `setup()` in the component options

#### Scenario: Composable uses Composition API internally

- GIVEN a developer writes the `useListView` composable
- WHEN they implement reactive state management
- THEN they MAY use `ref()`, `computed()`, and `watch()` from Vue 2.7's Composition API, because composables are not component definitions

### Requirement: Pinia State Management

All shared state MUST be managed through Pinia stores. The primary store pattern is the `useObjectStore` / `createObjectStore` factory, which creates typed Pinia stores for OpenRegister object CRUD operations.

Store plugins (`src/store/plugins/`) extend the base store with additional capabilities:
- `auditTrailsPlugin` — audit trail fetching and display
- `relationsPlugin` — object relationship management
- `filesPlugin` — file attachment CRUD
- `lifecyclePlugin` — lifecycle state transitions
- `registerMappingPlugin` — register/schema mapping configuration
- `selectionPlugin` — multi-select state for mass actions
- `searchPlugin` — search state with configurable search types (`SEARCH_TYPE`)

New state management needs MUST be implemented as Pinia store plugins or new store factories — NOT as Vue component-level Vuex stores or global state objects.

#### Scenario: Developer adds audit trail support

- GIVEN a consumer app wants audit trails for their object type
- WHEN they set up their store
- THEN they pass `auditTrailsPlugin` to `createObjectStore` and the store gains `fetchAuditTrails` and `auditTrails` state automatically

#### Scenario: Developer needs new shared state

- GIVEN a developer needs to add notification state management
- WHEN they implement it
- THEN they create a new Pinia store plugin in `src/store/plugins/` and export it from the plugins barrel, NOT a standalone Vuex module

### Requirement: Nextcloud Vue as Base Library

`@nextcloud/vue` (version ^8.0.0) is a peer dependency and serves as the foundational component library. Cn* components MUST wrap or compose Nc* primitives where appropriate — they do NOT reimplement Nextcloud's base components.

The library MUST NOT duplicate functionality already provided by `@nextcloud/vue`. If Nextcloud Vue provides a component (e.g., NcButton, NcDialog, NcAppSidebar), the library MUST use it rather than building a custom alternative.

#### Scenario: Developer needs a button

- GIVEN a Cn* component needs to render a button
- WHEN the developer implements the template
- THEN they use `<NcButton>` from `@nextcloud/vue`, NOT a custom `<CnButton>` or raw `<button>` element

#### Scenario: Developer needs a dialog wrapper

- GIVEN a developer builds CnFormDialog
- WHEN they implement the dialog chrome (overlay, close button, modal behavior)
- THEN they wrap `<NcDialog>` from `@nextcloud/vue` and add schema-driven form fields inside it

### Requirement: CSS Prefix and Theming

All CSS classes defined by this library MUST use the `cn-` prefix to avoid collisions with Nextcloud's own styles and consumer app styles (e.g., `cn-data-table`, `cn-pagination`, `cn-status-badge`).

All color, spacing, and typography values MUST reference Nextcloud CSS variables (`var(--color-primary-element)`, `var(--color-border)`, `var(--color-main-text)`, `var(--color-background-dark)`, etc.). Hard-coded color values (hex, rgb, hsl) MUST NOT be used.

The library MUST NOT reference `--nldesign-*` CSS variables directly. NL Design System theming works because the `nldesign` app overrides Nextcloud's own CSS variables — so using standard Nextcloud variables automatically picks up NL Design theming.

#### Scenario: Component defines a class

- GIVEN a developer adds styling to CnFilterBar
- WHEN they write the CSS
- THEN all classes are prefixed: `.cn-filter-bar`, `.cn-filter-bar__input`, `.cn-filter-bar--active`

#### Scenario: Component uses a color

- GIVEN a developer needs a primary-colored border
- WHEN they write the CSS rule
- THEN they write `border-color: var(--color-primary-element)` and NOT `border-color: #0082c9` or `border-color: var(--nldesign-color-primary)`

### Requirement: Peer Dependency Management

Dependencies that are provided by the Nextcloud runtime or by consumer apps MUST be declared as `peerDependencies`, NOT `dependencies`. This prevents duplicate copies in the consumer's bundle.

The following MUST remain peer dependencies:
- `vue` (^2.7.0) — Nextcloud runtime provides Vue
- `@nextcloud/vue` (^8.0.0) — Nextcloud component library
- `@nextcloud/axios` (^2.0.0) — HTTP client
- `@nextcloud/l10n` — translation utilities
- `@nextcloud/router` — Nextcloud routing
- `pinia` (^2.0.0) — state management
- `bootstrap-vue` (^2.23.1) — used by @nextcloud/vue internally
- `vue-material-design-icons` (^5.0.0) — MDI icon components

Direct `dependencies` (bundled into the output or required at runtime) MUST be limited to packages NOT available in the Nextcloud environment: `gridstack`, `vue-codemirror6`, `@codemirror/lang-json`, `vue-apexcharts`, `@nextcloud/capabilities`, `@nextcloud/dialogs`.

#### Scenario: Adding a new Nextcloud package dependency

- GIVEN a developer needs `@nextcloud/files` in a component
- WHEN they add it to `package.json`
- THEN it MUST be added to `peerDependencies` (not `dependencies`) because consumer apps already have it from the Nextcloud runtime

#### Scenario: Adding a third-party chart library

- GIVEN a developer needs a specialized visualization library not in the Nextcloud ecosystem
- WHEN they add it to `package.json`
- THEN it SHOULD be added to `dependencies` so it gets bundled, since consumers do not provide it

### Requirement: Backward Compatibility

Published releases MUST NOT contain breaking changes to the public API without a major version bump. The public API includes:
- Component props, events, slots, and their types/signatures
- Store factory functions, store state properties, actions, and getters
- Composable function signatures and return values
- Utility function signatures and return values
- CSS class names used by consumers for styling overrides

New props MUST always have default values so existing consumers are unaffected. Removed or renamed props MUST first be deprecated with a `console.warn` in at least one minor release before removal.

#### Scenario: Adding a new prop

- GIVEN a developer adds a `showHeader` prop to CnDataTable
- WHEN they define the prop
- THEN it MUST have `default: true` (or whatever preserves current behavior) so existing consumers see no change

#### Scenario: Deprecating a prop

- GIVEN a developer wants to rename the `items` prop to `rows` on CnDataTable
- WHEN they implement the change
- THEN they keep `items` working with a `console.warn('CnDataTable: "items" prop is deprecated, use "rows" instead')` in the `created` hook, AND add the new `rows` prop — the old prop MUST NOT be removed until the next major version

### Requirement: JSDoc Documentation

Every component MUST have JSDoc documentation on:
- All `props` — type, default, description of what the prop controls
- All emitted events — `@fires` or inline `@emit` documentation describing the event name, payload shape, and when it is emitted
- All slots — `@slot` documentation describing the slot name, scoped props, and purpose
- All public methods — parameters, return value, and behavior

Utility functions and composables MUST have JSDoc on their exported functions including `@param`, `@returns`, and a description.

#### Scenario: Component prop is documented

- GIVEN a developer reads the source of CnPagination
- WHEN they look at the `totalItems` prop
- THEN they see a JSDoc comment explaining it is a Number representing the total count of items across all pages

#### Scenario: Composable function is documented

- GIVEN a developer reads `useListView.js`
- WHEN they look at the exported function
- THEN they see `@param {Object} options` with nested `@param` entries for each option, and `@returns` describing the reactive state and methods returned

### Requirement: Test Directory Structure

Tests MUST be placed in the `tests/` directory at the project root, mirroring the `src/` structure:
- `tests/components/` — component tests using `@vue/test-utils` v1 (for Vue 2)
- `tests/store/` — store tests
- `tests/utils/` — utility function tests
- `tests/__mocks__/` — shared mock modules
- `tests/setup.js` — global test setup (Jest environment configuration)

Tests run via `npm test` (Jest). All new components and utilities SHOULD have corresponding tests. Test files MUST be named `ComponentName.spec.js` or `utilityName.spec.js`.

#### Scenario: Developer writes a component test

- GIVEN a developer creates CnStatusBadge
- WHEN they write the test
- THEN they create `tests/components/CnStatusBadge.spec.js` using `@vue/test-utils` `mount` or `shallowMount`, verifying prop rendering and event emission

#### Scenario: Running the test suite

- GIVEN a developer has made changes to the library
- WHEN they run `npm test`
- THEN Jest executes all `*.spec.js` files in `tests/` using the jsdom environment and Vue 2 transform configured in `jest.config.js`

### Requirement: Consumer Integration Pattern

Consumer apps MUST integrate the library using the following pattern:

1. Install as a dependency: `npm install @conduction/nextcloud-vue`
2. Import components and stores from the barrel: `import { CnIndexPage, useObjectStore } from '@conduction/nextcloud-vue'`
3. Import CSS: `import '@conduction/nextcloud-vue/src/css/index.css'` (or rely on the extracted `dist/nextcloud-vue.css` if using the built output)
4. Ensure all peer dependencies are installed (`vue`, `@nextcloud/vue`, `pinia`, etc.)

Consumer apps MUST configure their bundler (Webpack) to deduplicate shared dependencies via resolve aliases pointing to the consumer's own `node_modules` copies. This prevents duplicate Vue or Pinia instances at runtime.

Consumer apps known to use this library: OpenRegister, OpenCatalogi, Procest, Pipelinq, MyDash, LarpingApp, SoftwareCatalog, ZaakAfhandelApp, DocuDesk.

#### Scenario: Consumer app sets up the library

- GIVEN a developer bootstraps a new Nextcloud app
- WHEN they want to use CnIndexPage for their list view
- THEN they install `@conduction/nextcloud-vue`, import `CnIndexPage` from the barrel, import the CSS, and the component renders correctly using their app's Pinia store instance

#### Scenario: Consumer avoids duplicate Vue instances

- GIVEN a consumer app uses Webpack
- WHEN they build their app
- THEN their `webpack.config.js` includes `resolve.alias` entries for `vue` and `pinia` pointing to the consumer's `node_modules` to prevent the library from loading its own copy

### Requirement: Version Publishing Workflow

The library MUST use semantic versioning with support for pre-release tags (e.g., `0.1.0-beta.3`).

Publishing MUST follow this sequence:
1. All changes pass `npm test` and `npm run lint`
2. Version is bumped in `package.json` following semver (patch for fixes, minor for features, major for breaking changes)
3. `npm run build` produces fresh `dist/` output (also triggered automatically by `prepublishOnly`)
4. Package is published to npm under the `@conduction` scope

The `prepare` script ensures `dist/` is rebuilt on `npm install` from git. The `prepublishOnly` script ensures `dist/` is rebuilt before every `npm publish`.

#### Scenario: Publishing a new minor version

- GIVEN a developer has added new components with tests passing
- WHEN they publish
- THEN they bump the version (e.g., `0.1.0-beta.3` to `0.2.0`), run `npm publish`, and the `prepublishOnly` hook rebuilds `dist/` before upload

### Requirement: Translation Strategy for Components

Components MUST accept all user-visible strings as pre-translated props with English defaults. Components MUST NOT import `t()` or `n()` from any specific app's translation context (`@nextcloud/l10n`).

This allows each consumer app to pass translated strings using their own app's translation domain:

```js
<CnDeleteDialog :title="t('myapp', 'Delete item')" />
```

Props that represent translatable strings MUST have sensible English default values so the component works without explicit translation props.

#### Scenario: Component has translatable text

- GIVEN CnDeleteDialog needs to show "Are you sure?"
- WHEN the developer defines the component
- THEN they add a `confirmText` prop with `default: 'Are you sure you want to delete this item?'` and the consumer passes `t('myapp', 'Are you sure...')` to override

## MODIFIED Requirements

_(none — all new)_

## REMOVED Requirements

_(none — all new)_

---

## Current Implementation Status

**Already implemented:**
- Architecture overview page exists at `docs/architecture/overview.md` with the three-layer diagram and explanations
- Component mapping table is present in the overview page
- Schema-driven pattern documentation exists at `docs/architecture/schema-driven.md`, covering `columnsFromSchema`, `filtersFromSchema`, `fieldsFromSchema` (implemented in `src/utils/schema.js`)
- Store architecture documentation exists at `docs/architecture/store.md`, covering `createObjectStore`, plugin system, and `createSubResourcePlugin`
- A customization guide exists at `docs/architecture/customization.md`
- All architecture pages are auto-generated in the sidebar via `sidebars.js` (`type: 'autogenerated'`)
- Links to Nextcloud documentation are present in the footer of `docusaurus.config.js`
- Project structure follows the defined convention with all directories present
- Barrel export pattern is implemented at `src/index.js` with subdirectory barrels
- Rollup build pipeline produces ESM, CJS, and CSS outputs with correct externals
- All components use Vue 2.7 Options API
- Pinia stores with plugin system are fully implemented
- CSS uses `cn-` prefix consistently
- Peer dependencies are correctly separated from direct dependencies
- JSDoc is present on component props and events
- Test directory structure exists with component and store tests
- Translation props with English defaults are used throughout

**Source files backing these requirements:**
- `src/index.js` — Main barrel export
- `src/components/index.js` — Component barrel
- `src/store/index.js` — Store barrel
- `src/store/useObjectStore.js` — Store factory
- `src/store/createSubResourcePlugin.js` — Sub-resource plugin factory
- `src/store/plugins/` — All store plugins (auditTrails, relations, files, lifecycle, registerMapping, selection, search)
- `src/composables/index.js` — Composables barrel
- `src/utils/index.js` — Utilities barrel
- `src/utils/schema.js` — `columnsFromSchema()`, `filtersFromSchema()`, `fieldsFromSchema()`
- `src/css/index.css` — CSS entry point
- `src/types/index.d.ts` — TypeScript declarations
- `rollup.config.js` — Build configuration
- `package.json` — Dependency and script configuration
- `jest.config.js` — Test configuration
- `tests/setup.js` — Test setup

**Not yet verified:**
- Contextual links within architecture pages (spec requires links "in context" with explanatory text, not just footer links) — needs review of each page's inline references
- Whether the Mermaid diagram in overview.md matches the exact three-layer format specified
- Completeness of JSDoc across all components (some newer components may have gaps)

## Standards & References

- **Vue 2 Options API** — All components follow Vue 2 Options API (`export default { name, props, ... }`), not Composition API or `<script setup>`
- **Nextcloud design guidelines** — Components wrap Nextcloud Vue primitives (NcAppContent, NcAppSidebar, NcDialog, NcButton, etc.)
- **NL Design System** — Supported via CSS variables; nldesign app overrides Nextcloud CSS variables automatically. Components use `var(--color-primary-element)` etc., never `--nldesign-*` directly
- **WCAG AA** — Nextcloud Vue components provide baseline accessibility; Cn* components inherit this
- **Component library best practices** — Barrel exports, `cn-` CSS prefix, JSDoc on all props/events
- **Semantic Versioning** — All releases follow semver with pre-release tag support

## Specificity Assessment

- **Specific enough?** Yes, requirements are well-defined with concrete scenarios, file paths, and expected patterns.
- **Coverage:** 15 requirements covering project structure, barrel exports, build pipeline, Vue 2.7 constraint, Pinia stores, Nextcloud Vue base, CSS conventions, peer dependencies, backward compatibility, JSDoc, tests, consumer integration, version publishing, and translation strategy.
- **Open questions:**
  - Should the architecture docs also cover the URL sync / deeplink pattern in `useListView`?
  - Should the CnDashboardPage/CnDashboardGrid architecture (GridStack integration) have its own architecture page?
  - Should there be a requirement for the `src/constants/` directory convention and `metadata.js`?
