# Proposal: generated-quick-filters-count-as-the-list

## Why

r29 (25 Oct): the team queue's "Alle typen" tab read 19 and "Omgevingsvergunning" 7 over a list of 3 (the reader's team,
no handler). Tabs made by `quickFiltersFrom` carried the counts of one grouped aggregation over the page filter only, so
they ignored the active filters (the team) and came from a different query than the list.

## What changes

`quickFiltersFrom` tabs ask to be counted (`showCount`): the page counts each one as it counts declared tabs, within the
active filters and through the list endpoint (the request the list sends). The grouped number stays as the value shown
until that count arrives, and still orders the tabs. No schema change.
