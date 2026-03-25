# Navigation & Schema — Design

## CnIndexPage
Assembles CnPageHeader, CnActionsBar, CnFacetSidebar, CnViewModeToggle, and content slot into a standard index page layout. Zero-config when given a schema.

## Schema Utilities
- **columnsFromSchema(schema)** — Generates table column definitions from JSON Schema properties
- **filtersFromSchema(schema)** — Generates filter configurations from schema properties
- **formatValue(value, property)** — Formats values based on schema property type/format

## Supporting Components
- **CnIcon** — Maps MDI icon names to components via ICON_MAP lookup
- **CnPageHeader** — Title + breadcrumb + actions slot
- **CnActionsBar** — Add/refresh/mass action buttons
- **CnViewModeToggle** — Switch between table/card/list views
- **CnFacetSidebar** / **CnIndexSidebar** — Filter panel with faceted search
- **CnRegisterMapping** — Maps register/schema pairs to route config

## Store
Schema responses are cached in the Pinia store to avoid redundant API calls.
