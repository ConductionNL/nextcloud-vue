# detail-page Delta: detail-page-filters

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [detail-page-filters](../../)

## ADDED Requirements

### Requirement: A detail page can draw page filters that its widgets read

CnDetailPage SHALL take `pageFilters` (manifest `config.pageFilters`) with the shape and behaviour a dashboard's page
filters have: each entry writes its choice into the page's workspace context under its `key`, seeded from `default` or
the first option, with `control: "segmented"` drawn as a segmented group and anything else as a select, and options
listed, generated (`type: "quarter"` / `"year"`) or read (`optionsFrom`). The page SHALL provide that context as
`cnWorkspaceContext`, so a widget anywhere on the page resolves `@page.<key>` / `@workspace.<key>` against it. The
filters SHALL be drawn in the band, above its widgets, also when the band has no widgets. The seeding, option loading
and change handling SHALL be the same code a dashboard runs (one shared mixin).

#### Scenario: PtPortal period

- **GIVEN** a portal's detail page with `pageFilters: [{ key: "period", control: "segmented", options: 7, 30, 365, default: "30" }]`
- **AND** four KPI widgets whose endpoint params read `@page.period`
- **THEN** the band shows one "Periode" segmented group with 30 selected, and choosing 7 makes every KPI ask for 7 days
- **AND** no KPI draws a period picker of its own

#### Scenario: a dashboard keeps its page filters

- **GIVEN** a dashboard with page filters
- **THEN** they seed, load options and write the workspace context exactly as before
