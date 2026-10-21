# pl4-roadmap-flow Delta: pl4-roadmap-flow

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [pl4-roadmap-flow](../../)

## Purpose

Two page defaults that apps wrote one-line components for.

## ADDED Requirements

### Requirement: The roadmap page links to the app comparison

CnFeaturesAndRoadmapPage with `compareUrl` SHALL render a link above the page that opens the comparison in a new tab
(`rel="noopener noreferrer"`), with `compareLabel` through the app's translate (default "How this app compares") and
the host named beside it. A map SHALL pick the entry whose key starts the reader's language, else `default`. An address
that is not http(s) or same-origin SHALL render no link. Without `compareUrl` the page SHALL render as before.

#### Scenario: A Dutch reader

- **GIVEN** `compareUrl: { default: "https://pipelinq.conduction.nl/compare", nl: "https://pipelinq.conduction.nl/nl/compare" }`
- **WHEN** the reader's language is `nl`
- **THEN** the link opens `https://pipelinq.conduction.nl/nl/compare` in a new tab

### Requirement: A flow page mounts the flow sidebar by default

A `flow` or `flow-detail` page that names no `sidebarComponent` SHALL mount CnFlowSidebar in the app sidebar. A page
that names its own sidebar component SHALL keep it, and `sidebar: { show: false }` SHALL still hide the sidebar.

#### Scenario: pipelinq's flow page

- **GIVEN** `{ id: "FlowDetail", route: "/flows/:id", type: "flow", config: { app: "pipelinq" } }`
- **THEN** the app sidebar holds CnFlowSidebar
