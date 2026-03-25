# integration-guides Specification

## Purpose

Documents how `@conduction/nextcloud-vue` connects to external systems — specifically OpenRegister (the backend schema/object engine) and the NL Design System (theming layer). These guides help developers understand the full stack, not just the Vue components in isolation.

## Requirements

### Requirement: OpenRegister Integration Guide

The docs site MUST include a `docs/integrations/openregister.md` page explaining:
- What OpenRegister is — a schema-driven object store as a Nextcloud app
- How `createObjectStore` communicates with OpenRegister's REST API (`/apps/openregister/api/objects/{register}/{schema}`)
- The register JSON auto-import pattern — how `larpingapp_register.json` (or similar) defines schemas, sources, and registers that are auto-imported on app install
- How faceting works — schemas define `facetable` properties, the API returns facet counts, `CnFacetSidebar` renders them
- How relations work — schema properties with `$ref` link entities, `relationsPlugin` fetches related objects

#### Scenario: Developer understands the data flow

- GIVEN a developer reads the OpenRegister integration guide
- WHEN they follow the flow from register JSON → API → objectStore → CnIndexPage
- THEN they understand how a schema definition results in a working list page with data from OpenRegister

#### Scenario: Developer understands faceting

- GIVEN a developer reads the faceting section
- WHEN they see how a schema property with `facetable: true` appears as a sidebar filter
- THEN they understand how to make a property facetable and how CnFacetSidebar renders the options

### Requirement: NL Design System Integration Guide

The docs site MUST include a `docs/integrations/nldesign.md` page explaining:
- What the NL Design System is — Dutch government design standards implemented as CSS design tokens
- How the `nldesign` Nextcloud app provides Rijkshuisstijl and municipal theme support
- How `@conduction/nextcloud-vue` components are compatible with NL Design System theming — by using Nextcloud CSS variables (which nldesign overrides) rather than hardcoded colors
- What developers MUST do for NL Design compatibility: use standard Nc* CSS classes, avoid hardcoded colors, use CSS variables
- Available token sets: Rijkshuisstijl, Utrecht, Amsterdam, Den Haag, Rotterdam

#### Scenario: Developer understands theming

- GIVEN a developer reads the NL Design integration guide
- WHEN they understand the CSS variable chain (NL Design tokens → nldesign app → Nextcloud CSS vars → Cn* components)
- THEN they know that their app automatically gets government-compliant theming when the nldesign app is enabled

#### Scenario: Developer avoids theming pitfalls

- GIVEN a developer reads the compatibility requirements
- WHEN they build a custom component
- THEN they use CSS variables instead of hardcoded colors, ensuring nldesign compatibility

### Requirement: App Ecosystem Overview

The docs site MUST include a `docs/integrations/ecosystem.md` page listing the apps that use `@conduction/nextcloud-vue` and how they demonstrate different patterns:
- **OpenCatalogi** — Large-scale catalog with faceted search, public page rendering
- **Pipelinq** — CRM with pipeline views, kanban board, settings dashboard
- **Procest** — Case management with workflow states
- **LarpingApp** — Character/event management with computed stats and PDF export
- **MyDash** — Dashboard app with KPI widgets
- **Softwarecatalogus** — Software catalog built on OpenCatalogi

Each app entry MUST note which Cn* components it uses most heavily and link to the app's repository.

#### Scenario: Developer finds a pattern example

- GIVEN a developer wants to see how CnIndexPage is used in a real app
- WHEN they check the ecosystem overview
- THEN they see which apps use CnIndexPage and can look at the source for a working example

## MODIFIED Requirements

_(none — all new)_

## REMOVED Requirements

_(none — all new)_
