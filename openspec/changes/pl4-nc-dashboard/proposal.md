# pl4-nc-dashboard

## Why

pipelinq ships six Nextcloud Dashboard widgets as six components with six entry scripts. Three are lists the library
can already draw, but one needs a related object's name in its line, one merges leads and tickets, and one searches
clients and acts on each. Two are short create forms. The forms each had a real defect: one stored the translated
label of a category, both swallowed a failed create, and the client search filtered the first 200 clients in the
browser.

## What changes

- New CnNcDashboardQuickCreate: a create form from configuration (`fields`, `defaults`, `derive`, `successHref`,
  `list`), mounted by `registerNcDashboardWidgets` for a widget with `type: "quick-create"`.
- CnNcDashboardList grows:
  - `search`: a server-side search box;
  - `rowActions`: a menu per row with a link, a copy or an inline create;
  - `create`: an inline create form;
  - `sources` + `sortBy`: several sources merged, newest first, each row opening its own page;
  - `subtitle` as a list joined with a middle dot, empty parts dropped.

## Fleet reuse

- pipelinq: CreateLeadWidget and StartRequestWidget become quick-create config; FindClientWidget, DealsOverviewWidget,
  RecentActivitiesWidget and MyLeadsWidget become list config.
- shillinq and decidiq "new X" and "my X" widgets.
