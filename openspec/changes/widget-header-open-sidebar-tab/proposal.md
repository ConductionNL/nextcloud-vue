# Proposal: widget-header-open-sidebar-tab

## Why

DqZaakBetrokkenen (r43) draws a Toegang card with a "Delen" button in its title row. The case's full sharing flow (links, partner shares, transfers, federated shares) already lives in the object sidebar's Sharing tab. Three widgets open the sidebar on a tab, each in its own code (CnFactsWidget, CnTimelineManage, CnDetailPage), but a manifest header action could not.

## What changes

A widget header action `{ type: "open-sidebar-tab", tab }` opens the page's object sidebar on that tab. CnDetailWidgetHost passes the injected `objectSidebarState` to the header action resolver. Where the page has no object sidebar the button is left out rather than doing nothing. No schema change.
