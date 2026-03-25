# architecture-guide Specification

## Purpose

Explains the design philosophy and layered architecture of `@conduction/nextcloud-vue` — how it builds on Nextcloud's own component system to provide higher-level, schema-driven page patterns. This documentation bridges the gap between Nextcloud's developer docs and the actual app development experience.

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
