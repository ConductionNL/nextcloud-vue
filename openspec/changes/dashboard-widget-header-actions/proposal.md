# Proposal: dashboard-widget-header-actions

## Why

`headerActions` on a widget definition draw buttons in its card's title row on a detail page only. The dashboard boards
draw them too: DqCatalogus "Objecttype toevoegen" on the object types card, DqTermijnen "Kwartaalrapport downloaden" on
the quarterly report card.

## What changes

CnDashboardPage resolves each widget's `headerActions` (translated, dispatched through the action dispatcher with the
page's router) and hands them to the card's new `headerActions` prop. CnWidgetWrapper draws a provided list first, else
the prop.
