# detail-page-filters

## Why

The PtPortal board draws one period selector ("Periode: 7 dagen | 30 dagen | 12 maanden") above the portal's four
traffic figures, and every figure follows it. Live, each figure carried its own period picker, because a detail page
had no page-level filter. A dashboard has one: `config.pageFilters` writes each choice into the page's workspace
context, and a widget reads it through `@page.<key>`.

## What changes

- CnDetailPage takes the same `pageFilters` (manifest `config.pageFilters`, already in the shared page config schema)
  and draws them in its band, right-aligned above the band's widgets, as a segmented group or a select.
- The detail page provides the same `cnWorkspaceContext` a dashboard provides, so a widget on the page reads a choice
  through `@page.<key>` / `@workspace.<key>` exactly as it does on a dashboard.
- One mechanism, not two: the seeding, option loading (`optionsFrom`, generated quarter and year options) and change
  handling move out of CnDashboardPage into a shared `pageFilters` mixin that both pages use.
