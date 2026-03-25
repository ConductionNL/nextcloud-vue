# architecture-guide Specification

## Purpose

Explains the design philosophy and layered architecture of `@conduction/nextcloud-vue` — how it builds on Nextcloud's own component system to provide higher-level, schema-driven page patterns. This documentation bridges the gap between Nextcloud's developer docs and the actual app development experience.

## ADDED Requirements

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
- The plugin system — how `auditTrailsPlugin`, `relationsPlugin`, `filesPlugin`, `lifecyclePlugin`, and `registerMappingPlugin` extend the store
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

## MODIFIED Requirements

_(none — all new)_

## REMOVED Requirements

_(none — all new)_

---

### Current Implementation Status

**Already implemented:**
- Architecture overview page exists at `docs/architecture/overview.md` with the three-layer diagram and explanations
- Component mapping table is present in the overview page
- Schema-driven pattern documentation exists at `docs/architecture/schema-driven.md`, covering `columnsFromSchema`, `filtersFromSchema`, `fieldsFromSchema` (implemented in `src/utils/schema.js`)
- Store architecture documentation exists at `docs/architecture/store.md`, covering `createObjectStore`, plugin system, and `createSubResourcePlugin`
- A customization guide exists at `docs/architecture/customization.md`
- All architecture pages are auto-generated in the sidebar via `sidebars.js` (`type: 'autogenerated'`)
- Links to Nextcloud documentation are present in the footer of `docusaurus.config.js` (Nextcloud Vue Components, Layout Components, App Development)

**Source files backing these docs:**
- `src/store/useObjectStore.js` — `createObjectStore`, `useObjectStore`, `defineObjectStore` with plugin merging
- `src/store/createSubResourcePlugin.js` — Sub-resource plugin factory
- `src/store/plugins/` — `auditTrails.js`, `relations.js`, `files.js`, `lifecycle.js`, `registerMapping.js`
- `src/utils/schema.js` — `columnsFromSchema()`, `filtersFromSchema()`, `fieldsFromSchema()`
- `src/composables/` — `useListView.js`, `useDetailView.js`, `useSubResource.js`, `useDashboardView.js`

**Not yet implemented / to verify:**
- Contextual links within architecture pages (spec requires links "in context" with explanatory text, not just footer links) — needs review of each page's inline references
- Whether the Mermaid diagram in overview.md matches the exact three-layer format specified (Layer 1/2/3)

### Standards & References

- **Vue 2 Options API** — All components follow Vue 2 Options API (`export default { name, props, ... }`), not Composition API or `<script setup>`
- **Nextcloud design guidelines** — Components wrap Nextcloud Vue primitives (NcAppContent, NcAppSidebar, NcDialog, NcButton, etc.)
- **NL Design System** — Supported via CSS variables; nldesign app overrides Nextcloud CSS variables automatically. Components use `var(--color-primary-element)` etc., never `--nldesign-*` directly
- **WCAG AA** — Nextcloud Vue components provide baseline accessibility; Cn* components inherit this
- **Component library best practices** — Barrel exports, `cn-` CSS prefix, JSDoc on all props/events

### Specificity Assessment

- **Specific enough?** Yes, requirements are well-defined with concrete scenarios and expected content structure.
- **Missing/ambiguous:**
  - The spec references `initializeStores()` at app boot but does not specify where this is documented — it is covered in `docs/getting-started.md`, not in the architecture section itself.
  - The `registerMappingPlugin` is listed in the store plugins but not mentioned in the component mapping table — unclear if it should be.
  - No requirement for the `useDashboardView` composable or dashboard architecture to be documented in the architecture section.
- **Open questions:**
  - Should the architecture docs also cover the new URL sync / deeplink pattern in `useListView`?
  - Should the CnDashboardPage/CnDashboardGrid architecture (GridStack integration) have its own architecture page?
