# Proposal: page-header-breadcrumb

## Why

The dossiq boards DqZaaktypen, DqCatalogus, DqInstellingen*, DqVthInstellingen, DqAfdelingen, DqPrivacy and DqContracten
draw a breadcrumb and a note under the page title: "Instellingen / Zaaktypen · 14 zaaktypen". A detail page can do that
(`config.breadcrumb`, `config.headerMeta`); a list, dashboard or settings page could not.

## What changes

- CnPageHeader takes `breadcrumb` (one crumb `{ label, route?, params?, href?, icon?, separator? }` or a list) and
  `meta`. The title follows the crumbs as the current crumb, then a middle dot and the meta.
- The line is the detail header's breadcrumb row: the same markup and classes (`cn-detail-page__header-row2`,
  `cn-detail-page__breadcrumbs--row2`, `cn-detail-page__header-dot`, `cn-detail-page__header-meta`), drawn by a shared
  CnHeaderTrail, so there is one breadcrumb style.
- CnIndexPage, CnDashboardPage and CnSettingsPage take `breadcrumb` and `headerMeta` from manifest config. On an index
  page `{total}` and `{shown}` in the meta are the list's counts.
- Without either key nothing changes.
- A dashboard widget card can carry `subtitle`, a muted line under its title (CnWidgetWrapper `subtitle`), and a
  dashboard's segmented period group can sit at the end of the description line (`dateRange.placement:
  "description"`), for the boards DqTermijnen, DqProcesanalyse and DqDoorlooptijd.
- Manifest schema: `config.breadcrumb` also accepts a list, and both keys are described for these page types.
