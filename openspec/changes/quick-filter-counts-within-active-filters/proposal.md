# Proposal: quick-filter-counts-within-active-filters

## Why

DqTeamwachtrij draws "Alle typen 11" over a team queue of 11 cases. On :8080 (25 Oct, REFRESH-2) the tab read 78, every
unassigned case: the quick-filter counts were narrowed by the page's own filter only, not by the active filters (the
reader's team), so a tab's number disagreed with the list under it.

## What changes

A quick-filter tab's count is taken within the active filters (the tab's own field set by the tab); a saved view's count
stays its own query. The count request key includes the active filters, so a filter change recounts. No schema change.
