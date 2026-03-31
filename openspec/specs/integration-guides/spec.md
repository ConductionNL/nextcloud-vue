---
status: reviewed
---

# integration-guides Specification

## Purpose

Documents how `@conduction/nextcloud-vue` connects to external systems -- specifically OpenRegister (the backend schema/object engine), the NL Design System (theming layer), and the consumer app ecosystem. These guides help developers understand the full stack, not just the Vue components in isolation.

## Requirements

### Requirement: OpenRegister Integration Guide

The docs site MUST include a `docs/integrations/openregister.md` page explaining:
- What OpenRegister is -- a schema-driven object store as a Nextcloud app
- How `createObjectStore` communicates with OpenRegister's REST API (`/apps/openregister/api/objects/{register}/{schema}`)
- The register JSON auto-import pattern -- how `{appname}_register.json` defines schemas, sources, and registers that are auto-imported on app install
- How faceting works -- schemas define `facetable` properties, the API returns facet counts, `CnFacetSidebar` renders them
- How relations work -- schema properties with `$ref` link entities, `relationsPlugin` fetches related objects
- How the `searchPlugin` provides full-text search with `SEARCH_TYPE` configuration
- How `buildHeaders()` and `buildQueryString()` construct API requests

#### Scenario: Developer understands the data flow

- GIVEN a developer reads the OpenRegister integration guide
- WHEN they follow the flow from register JSON -> API -> objectStore -> CnIndexPage
- THEN they SHALL understand how a schema definition results in a working list page with data from OpenRegister

#### Scenario: Developer understands faceting

- GIVEN a developer reads the faceting section
- WHEN they see how a schema property with `facetable: true` appears as a sidebar filter
- THEN they SHALL understand how to make a property facetable and how CnFacetSidebar renders the options with counts

#### Scenario: Developer understands relations

- GIVEN a developer reads the relations section
- WHEN they see a schema property with `$ref` pointing to another schema
- THEN they SHALL understand how relationsPlugin auto-fetches related objects and how the UI renders relation links

#### Scenario: Developer understands the register JSON format

- GIVEN a developer reads the register JSON section
- WHEN they look at the example JSON structure
- THEN they SHALL see how schemas define properties (with types, formats, facetable, required), how registers group schemas, and how sources configure external data imports

#### Scenario: Developer understands search configuration

- GIVEN a developer reads the search section
- WHEN they review the searchPlugin configuration
- THEN they SHALL understand SEARCH_TYPE options (full-text, column-specific), getRegisterApiUrl/getSchemaApiUrl helpers, and how CnFilterBar triggers search via the store

### Requirement: NL Design System Integration Guide

The docs site MUST include a `docs/integrations/nldesign.md` page explaining:
- What the NL Design System is -- Dutch government design standards implemented as CSS design tokens
- How the `nldesign` Nextcloud app provides Rijkshuisstijl and municipal theme support
- How `@conduction/nextcloud-vue` components are compatible with NL Design System theming -- by using Nextcloud CSS variables (which nldesign overrides) rather than hardcoded colors
- What developers MUST do for NL Design compatibility: use standard Nc* CSS classes, use `cn-` prefixed classes, avoid hardcoded colors, use CSS variables
- What developers MUST NOT do: reference `--nldesign-*` variables directly (the nldesign app overrides Nextcloud's own variables, so theming works automatically through `--color-primary-element` etc.)
- Available token sets: Rijkshuisstijl, Utrecht, Amsterdam, Den Haag, Rotterdam
- WCAG AA compliance requirements for color contrast

#### Scenario: Developer understands theming

- GIVEN a developer reads the NL Design integration guide
- WHEN they understand the CSS variable chain (NL Design tokens -> nldesign app -> Nextcloud CSS vars -> Cn* components)
- THEN they SHALL know that their app automatically gets government-compliant theming when the nldesign app is enabled

#### Scenario: Developer avoids theming pitfalls

- GIVEN a developer reads the compatibility requirements
- WHEN they build a custom component
- THEN they SHALL use CSS variables (e.g., `var(--color-primary-element)`, `var(--color-border)`) instead of hardcoded colors, ensuring nldesign compatibility

#### Scenario: Developer understands the do-not-reference rule

- GIVEN a developer reads the NL Design guide
- WHEN they consider using `--nldesign-*` CSS variables directly
- THEN the guide SHALL explicitly warn against this and explain that the nldesign app overrides Nextcloud variables, so components should only reference Nextcloud CSS variables

#### Scenario: Available themes are listed

- GIVEN a developer reads the available token sets section
- WHEN they review the list
- THEN they SHALL see at minimum Rijkshuisstijl, Utrecht, Amsterdam, Den Haag, and Rotterdam with a note on how to request additional municipal themes

#### Scenario: WCAG compliance guidance is provided

- GIVEN a developer reads the accessibility section
- WHEN they review the contrast requirements
- THEN they SHALL understand that NL Design tokens are pre-tested for WCAG AA compliance and that custom colors MUST also meet AA contrast ratios

### Requirement: App Ecosystem Overview

The docs site MUST include a `docs/integrations/ecosystem.md` page listing the apps that use `@conduction/nextcloud-vue` and how they demonstrate different patterns:
- **OpenRegister** -- Foundation app; demonstrates all core components, register/schema management, object CRUD
- **OpenCatalogi** -- Large-scale catalog with faceted search via CnFacetSidebar, public page rendering, CnIndexPage with heavy slot customization
- **Pipelinq** -- CRM with CnIndexPage for contacts/organizations, CnDashboardPage for KPI dashboards, pipeline views with CnTimelineStages, settings management with CnSettingsCard/CnConfigurationCard
- **Procest** -- Case management with CnIndexPage for zaak lists, workflow state transitions, CnAdvancedFormDialog for complex case editing
- **LarpingApp** -- Character/event management with computed stats, PDF export, CnFormDialog with extensive field overrides
- **MyDash** -- Dashboard-focused app using CnDashboardPage, CnWidgetWrapper, CnTileWidget for widget-based layouts
- **ZaakAfhandelApp** -- Case handling with CnDetailPage, CnObjectSidebar, CnNotesCard, CnTasksCard for case detail views
- **SoftwareCatalog** -- Software catalog built on OpenCatalogi patterns

Each app entry MUST note which Cn* components it uses most heavily, link to the app's GitHub repository, and describe the primary usage pattern.

#### Scenario: Developer finds a pattern example

- GIVEN a developer wants to see how CnIndexPage is used in a real app
- WHEN they check the ecosystem overview
- THEN they SHALL see which apps use CnIndexPage (OpenRegister, OpenCatalogi, Pipelinq, Procest, LarpingApp) and can follow the repository link to see working source code

#### Scenario: Developer finds dashboard pattern

- GIVEN a developer wants to build a dashboard with widgets
- WHEN they check the ecosystem overview
- THEN they SHALL find MyDash and Pipelinq listed as apps demonstrating CnDashboardPage usage with links to their repositories

#### Scenario: Developer finds dialog customization pattern

- GIVEN a developer wants to heavily customize CnFormDialog fields
- WHEN they check the ecosystem overview
- THEN they SHALL find LarpingApp listed as demonstrating extensive #field-{key} slot overrides

#### Scenario: Developer finds detail view pattern

- GIVEN a developer wants to build a detail view with sidebar
- WHEN they check the ecosystem overview
- THEN they SHALL find ZaakAfhandelApp listed as demonstrating CnDetailPage, CnObjectSidebar, CnNotesCard, and CnTasksCard

### Requirement: Per-App Webpack Configuration Reference

The integration guides MUST include a `docs/integrations/webpack-config.md` page showing the standard webpack configuration shared across all consumer apps. This MUST include:
- The base `@nextcloud/webpack-vue-config` import
- The `@conduction/nextcloud-vue` source alias pattern
- Deduplication aliases for vue, pinia, @nextcloud/vue
- VueLoaderPlugin replacement
- The `sideEffects` configuration
- Any app-specific overrides that are commonly needed

#### Scenario: Developer configures a new app

- GIVEN a developer is creating a new Conduction app
- WHEN they read the webpack configuration reference
- THEN they SHALL find a complete, copy-pasteable `webpack.config.js` that works for any new consumer app

#### Scenario: Developer troubleshoots build issues

- GIVEN a developer has build errors related to duplicate modules
- WHEN they compare their webpack config to the reference
- THEN they SHALL be able to identify missing aliases or incorrect paths

#### Scenario: Local dev vs npm package paths are explained

- GIVEN a developer works with the library locally via symlink
- WHEN they read the alias configuration
- THEN the guide SHALL explain the difference between the local dev path (`../nextcloud-vue/src`) and the npm package path, and how to configure both

### Requirement: Store Registration Pattern Guide

The integration guides MUST include a `docs/integrations/store-pattern.md` page explaining the standard pattern for connecting stores across consumer apps:
- Creating the object store with `createObjectStore`
- Plugin selection based on app needs
- Settings store pattern for fetching register/schema mappings
- The `initializeStores()` bootstrap function
- How to extend the store with app-specific actions using Pinia's `$patch`
- How `createSubResourcePlugin` enables sub-resource CRUD (e.g., files, audit trails as sub-resources of an object)

#### Scenario: Developer selects plugins for their app

- GIVEN a developer reads the plugin selection guide
- WHEN they assess their app's needs
- THEN they SHALL understand which plugins to include: filesPlugin (if app manages file attachments), auditTrailsPlugin (if app tracks changes), relationsPlugin (if schemas use $ref), registerMappingPlugin (always recommended), selectionPlugin (if bulk selection is needed), searchPlugin (if full-text search is needed)

#### Scenario: Developer extends the store

- GIVEN a developer needs custom store actions beyond CRUD
- WHEN they read the store extension section
- THEN they SHALL understand how to add app-specific actions to the store instance without modifying the library

#### Scenario: Developer sets up sub-resource plugin

- GIVEN a developer's objects have sub-resources (e.g., attachments)
- WHEN they read the createSubResourcePlugin section
- THEN they SHALL understand how to configure the plugin with a sub-resource type and base URL

### Requirement: Component Override Patterns Guide

The integration guides MUST include a `docs/integrations/component-overrides.md` page documenting how consumer apps customize library components:
- CnIndexPage dialog override system (three levels: full dialog slot, form content slot, per-field slot)
- CnIndexPage action customization via #action-items and #header-actions slots
- CnIndexPage mass action customization via #mass-actions slot
- CnDashboardPage widget rendering via #widget-{id} slots
- CnFormDialog field override via #field-{key} slots with access to field value, schema, and update function
- Translation prop pattern: passing pre-translated strings via props with English defaults

#### Scenario: Developer overrides a single form field

- GIVEN a developer needs a custom date picker instead of the default CnFormDialog field
- WHEN they read the per-field override section
- THEN they SHALL see an example using `#field-dateOfBirth="{ value, update }"` to render a custom input that calls `update(newValue)` on change

#### Scenario: Developer replaces the entire form dialog

- GIVEN a developer needs CnAdvancedFormDialog instead of CnFormDialog in CnIndexPage
- WHEN they read the full dialog replacement section
- THEN they SHALL see an example using `#form-dialog="{ item, schema, close }"` to render CnAdvancedFormDialog with proper event handling

#### Scenario: Developer adds custom mass actions

- GIVEN a developer needs a "Merge" mass action in addition to the built-in ones
- WHEN they read the mass action customization section
- THEN they SHALL see an example using #mass-actions slot with access to count and selectedIds

#### Scenario: Developer adds custom header actions

- GIVEN a developer needs an "Export All" button in the CnIndexPage header
- WHEN they read the action customization section
- THEN they SHALL see an example using #header-actions slot to add custom NcButton components

#### Scenario: Developer provides Dutch translations

- GIVEN a developer builds an app that must support Dutch
- WHEN they read the translation prop pattern section
- THEN they SHALL understand that all Cn* components accept pre-translated strings via props (e.g., `addLabel`, `deleteLabel`) and that the app is responsible for calling `t()` at the view level, not inside the library components

### Requirement: CSS Import and Theming Guide

The integration guides MUST include a `docs/integrations/css-theming.md` page explaining:
- The automatic CSS import via barrel (`import { ... } from '@conduction/nextcloud-vue'` auto-includes `src/css/index.css`)
- The `cn-` CSS class prefix convention and why it exists (collision avoidance with Nextcloud's own classes)
- How to write custom component CSS that is NL Design compatible (use CSS variables only)
- Dark mode compatibility (Nextcloud CSS variables automatically adjust for dark mode)
- How the component CSS interacts with `@nextcloud/vue` component styles

#### Scenario: Developer understands CSS auto-import

- GIVEN a developer imports components from the barrel
- WHEN they check their rendered page
- THEN the guide SHALL explain that CSS is auto-imported via `src/index.js` which imports `src/css/index.css`, and no separate CSS import is needed

#### Scenario: Developer writes custom CSS

- GIVEN a developer adds custom styles to a component using Cn* components
- WHEN they follow the theming guide
- THEN they SHALL use `var(--color-primary-element)`, `var(--color-text-maxcontrast)`, `var(--color-border)`, etc. and MUST NOT use hardcoded color values

#### Scenario: Developer understands cn- prefix

- GIVEN a developer inspects the DOM of a Cn* component
- WHEN they see classes like `cn-data-table`, `cn-pagination`, `cn-status-badge`
- THEN the guide SHALL explain that all library classes use the `cn-` prefix to prevent collisions with Nextcloud's own CSS classes

#### Scenario: Dark mode works automatically

- GIVEN a user switches Nextcloud to dark mode
- WHEN they view an app using Cn* components
- THEN the guide SHALL explain that components automatically adapt because they use Nextcloud CSS variables which are dark-mode-aware

#### Scenario: Developer overrides component styles

- GIVEN a developer needs to adjust a Cn* component's appearance
- WHEN they read the CSS override section
- THEN they SHALL understand how to use scoped styles with deep selectors (`::v-deep .cn-data-table`) to override library styles without affecting other components

### Requirement: i18n Integration Guide

The integration guides MUST include a `docs/integrations/i18n.md` page explaining:
- The library's translation strategy: components accept pre-translated strings via props with English defaults
- Why the library does NOT import `t()` directly (it is framework-agnostic; consumer apps provide translations)
- How consumer apps should use Nextcloud's `t()` function at the view level to translate labels before passing them as props
- The minimum language requirements: Dutch (nl) and English (en)
- How to translate schema-derived labels (column headers, filter labels, etc.)

#### Scenario: Developer provides translations

- GIVEN a developer's app must support Dutch and English
- WHEN they read the i18n guide
- THEN they SHALL understand how to pass translated strings to Cn* components via props (e.g., `:add-label="t('myapp', 'Add contact')"`)

#### Scenario: Developer understands why library does not use t()

- GIVEN a developer wonders why components have label props instead of auto-translating
- WHEN they read the i18n guide
- THEN they SHALL understand that importing `t()` would couple the library to a specific Nextcloud app's translation domain, breaking reuse across apps

#### Scenario: Schema-derived labels are translatable

- GIVEN a developer uses columnsFromSchema to generate table columns
- WHEN they read the i18n guide
- THEN they SHALL understand how to provide translated column headers via the options parameter or by post-processing the generated columns

#### Scenario: Minimum language requirements are clear

- GIVEN a developer is planning their app's translation effort
- WHEN they read the requirements
- THEN they SHALL know that Dutch (nl) and English (en) are the minimum required languages for all Conduction apps

### Requirement: Architecture Data Flow Diagram

The OpenRegister integration guide MUST include a Mermaid diagram showing the complete data flow:
1. User interacts with CnIndexPage (search, filter, sort, paginate)
2. CnIndexPage emits events to the view component
3. View component (or useListView composable) calls objectStore methods
4. objectStore constructs API request using buildHeaders/buildQueryString
5. OpenRegister API processes the request
6. API response flows back through store -> computed -> CnIndexPage props

#### Scenario: Developer reads the data flow diagram

- GIVEN a developer visits the OpenRegister integration page
- WHEN they look at the data flow diagram
- THEN they SHALL see a Mermaid sequence diagram showing the round-trip from user interaction through CnIndexPage -> view -> store -> API -> store -> CnIndexPage

#### Scenario: Diagram renders in Docusaurus

- GIVEN the docs site has Mermaid support enabled
- WHEN the OpenRegister integration page renders
- THEN the Mermaid diagram MUST render as an SVG, not as raw Mermaid syntax text

#### Scenario: Diagram includes error path

- GIVEN the data flow diagram shows the happy path
- WHEN a developer looks for error handling
- THEN the diagram or accompanying text SHALL show how API errors flow back through parseResponseError -> store error state -> UI error display

### Requirement: Migration Guide for Existing Apps

The integration guides MUST include a `docs/integrations/migration.md` page for apps migrating from custom implementations to `@conduction/nextcloud-vue`:
- How to replace custom Pinia stores with `createObjectStore`
- How to replace custom data tables with CnDataTable/CnIndexPage
- How to replace custom form dialogs with CnFormDialog/CnAdvancedFormDialog
- Common migration pitfalls (dual instance bugs, CSS conflicts, event naming differences)
- Step-by-step migration checklist

#### Scenario: Developer migrates a custom store

- GIVEN a developer has a custom Pinia store for CRUD operations
- WHEN they read the store migration section
- THEN they SHALL understand how to map their existing actions (fetch, create, update, delete) to createObjectStore's built-in methods and how to register their object types

#### Scenario: Developer migrates a custom data table

- GIVEN a developer has a custom NcTable-based data table
- WHEN they read the data table migration section
- THEN they SHALL understand how to replace it with CnDataTable or CnIndexPage, including mapping their existing columns to the schema-driven column format via columnsFromSchema

#### Scenario: Developer follows migration checklist

- GIVEN a developer is migrating an existing app
- WHEN they follow the migration checklist
- THEN they SHALL have a step-by-step list covering: install library, configure webpack, replace store, replace components, test, remove old code

## MODIFIED Requirements

_(none -- all new)_

## REMOVED Requirements

_(none -- all new)_

---

## Current Implementation Status

**Partially implemented:**
- OpenRegister integration guide exists at `docs/integrations/openregister.md`
- NL Design System integration guide exists at `docs/integrations/nldesign.md`
- App ecosystem overview exists at `docs/integrations/ecosystem.md`
- i18n integration guide exists at `docs/integrations/i18n.md`
- Docs site infrastructure with category config at `docs/integrations/_category_.json`

**Not yet implemented:**
- Per-app webpack configuration reference (`docs/integrations/webpack-config.md`)
- Store registration pattern guide (`docs/integrations/store-pattern.md`)
- Component override patterns guide (`docs/integrations/component-overrides.md`)
- CSS import and theming guide (`docs/integrations/css-theming.md`)
- Architecture data flow Mermaid diagram in the OpenRegister guide
- Migration guide (`docs/integrations/migration.md`)
- Existing guides may not yet cover all scenarios (faceting flow, register JSON auto-import, CSS variable chain, search plugin configuration)
- Ecosystem page may not list all 8 consumer apps with their specific component usage patterns

**Components/composables/utilities referenced:**
- `createObjectStore` (`src/store/useObjectStore.js`)
- `createSubResourcePlugin` (`src/store/createSubResourcePlugin.js`)
- All store plugins (`src/store/plugins/`)
- `CnFacetSidebar`, `CnIndexPage`, `CnFormDialog`, `CnAdvancedFormDialog`, `CnDashboardPage`
- `useListView`, `useDetailView`, `useDashboardView` composables
- `buildHeaders`, `buildQueryString`, `columnsFromSchema`, `filtersFromSchema`, `fieldsFromSchema` utilities

## Standards & References

- **Nextcloud developer documentation** conventions
- **NL Design System** (https://nldesignsystem.nl/) -- Dutch government design token standard
- **OpenRegister REST API** -- `/apps/openregister/api/objects/{register}/{schema}`
- **WCAG AA** -- Theming documentation must reference accessibility requirements for color contrast
- **Mermaid** -- Used for data flow diagrams in Docusaurus
- **@nextcloud/webpack-vue-config** -- Base webpack configuration for all consumer apps

## Specificity Assessment

- **Specific enough?** Yes, the 10 requirements cover OpenRegister data flow, NL Design theming, app ecosystem, webpack configuration, store patterns, component overrides, CSS theming, i18n, architecture diagrams, and migration -- all with concrete scenarios.
- **Missing/ambiguous:**
  - Exact content depth for each existing integration doc is not prescribed (e.g., how many code examples per section)
  - The ecosystem page's app list may need updating as new apps are created
  - The migration guide scope is broad -- may need to be broken into per-pattern migration docs
- **Open questions:**
  - Should integration guides include runnable code examples or just conceptual explanations?
  - Should the ecosystem page auto-generate from app package.json dependencies or be manually maintained?
  - Should there be a separate guide for non-OpenRegister backends (apps that use the library's UI components with a different data source)?
