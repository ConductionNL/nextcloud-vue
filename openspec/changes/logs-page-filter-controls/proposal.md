# A logs page draws the filter controls it declares

## Why
integriq declares filter controls on its six log pages (`observability-log-filters`, REQ-LOGF-001 and REQ-LOGF-002;
nextcloud-vue#1291). CnLogsPage drew no filter bar, so the declarations did nothing.

## What changes
CnLogsPage takes `filterControls` (`select`, `reference`, `dateRange`), draws them above the table, folds their values
into the fetch under the page `filter`, and keeps them in the address (`replace`) so a filtered view is a link and a
row action's `?<key>=` deep link opens with the control set. `range.defaultDays` preselects the last N days on first
load. Helpers in `utils/logFilterControls.js`. No schema change: the logs page config is open.
