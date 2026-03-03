---
sidebar_position: 3
---

# App Ecosystem

These apps are built with `@conduction/nextcloud-vue`, demonstrating different patterns.

## Apps Using the Library

### OpenCatalogi

**Repository**: [ConductionNL/opencatalogi](https://github.com/ConductionNL/opencatalogi)

Large-scale catalog application with faceted search and public page rendering. Demonstrates:
- **CnFacetSidebar** — complex faceted search across multiple schemas
- **CnIndexPage** — list views for publications, organizations, themes
- **CnDataTable** — tables with custom cell renderers and status badges
- Multi-schema search with aggregated facets

### Pipelinq

**Repository**: [ConductionNL/pipelinq](https://github.com/ConductionNL/pipelinq)

CRM and pipeline management. Demonstrates:
- **CnIndexPage** — client, lead, and request list views
- **CnIndexSidebar** — tabbed sidebar with filters and column visibility
- **CnFormDialog** — create/edit forms for clients and leads
- **CnSettingsSection** + **CnRegisterMapping** — admin settings with OpenRegister configuration
- Pipeline (kanban) views alongside standard list views

### Procest

**Repository**: [ConductionNL/procest](https://github.com/ConductionNL/procest)

Case management with workflow states. Demonstrates:
- **CnStatusBadge** — workflow state indicators with color maps
- **CnIndexPage** — case list with status-based filtering
- **CnFormDialog** — case creation with custom field overrides
- Lifecycle plugin for state transition hooks

### LarpingApp

**Repository**: [ConductionNL/larpingapp](https://github.com/ConductionNL/larpingapp)

Character and event management for LARP (Live Action Role Playing). Demonstrates:
- **registerIcons** — registering domain-specific icons (Sword, MagicStaff, ShieldSwordOutline)
- **CnIndexPage** — character, event, ability, and item list views
- **CnObjectCard** + **CnCardGrid** — card-based views for visual browsing
- Multiple entity types (8+ schemas) all using the same shared components

### MyDash

**Repository**: [ConductionNL/mydash](https://github.com/ConductionNL/mydash)

Dashboard app with KPI widgets. Demonstrates:
- **CnKpiGrid** — responsive grid layout for dashboard cards
- **CnStatsBlock** — statistics display with icons, counts, and breakdowns
- Dashboard-first UX with minimal list/detail patterns

### Softwarecatalogus

**Repository**: [VNG-Realisatie/Softwarecatalogus](https://github.com/VNG-Realisatie/Softwarecatalogus)

Software catalog for Dutch government organizations. Built on OpenCatalogi. Demonstrates:
- Public-facing catalog with faceted search
- Complex data model (applications, modules, koppelingen/integrations)
- Organization-scoped data with multitenancy

## Common Patterns

### Every App Uses

- `createObjectStore` with plugins for state management
- `CnIndexPage` for list views
- `registerIcons` for schema-specific icons
- `initializeStores()` pattern at boot

### Most Apps Use

- `CnIndexSidebar` for search/filter/column controls
- `CnFormDialog` for create/edit
- `CnDeleteDialog` and `CnCopyDialog` for single-item actions
- `CnSettingsSection` and `CnRegisterMapping` in admin settings

### Some Apps Use

- `CnFacetSidebar` for faceted search (OpenCatalogi, Softwarecatalogus)
- `CnKpiGrid` + `CnStatsBlock` for dashboards (MyDash)
- `CnStatusBadge` for workflow states (Procest)
- `CnCardGrid` + `CnObjectCard` for visual browsing (LarpingApp)
