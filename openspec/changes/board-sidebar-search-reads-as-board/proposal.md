# Proposal: board-sidebar-search-reads-as-board

## Why

Board DqZakenSorteren draws the side panel's search as the list's own search field: a magnifier and "Zoek op zaak,
nummer of verzoeker". On :8080 (24 Oct) the field read "Zoeken" with no hint: CnIndexSidebar labels it "Search" and
takes its placeholder only from `sidebar.search`, which dossiq does not set.

## What changes

- CnIndexPage hands the sidebar the list's search hint (`shownSearchPlaceholder`) unless `sidebar.search` names one.
- In the board look CnIndexSidebar names the field by that hint and draws the magnifier; the Nextcloud look keeps its
  "Search" label. No schema change.
