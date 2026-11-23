# Proposal: tabs-widget-header-link

## Why

Board ShDebiteurenbeheer draws its open invoices behind a tab strip, with "Alle verkoopfacturen" beside the strip
(shillinq #2031). The widget in that tab already declares `headerLink`, but inside a tab panel the link was dropped:
a panel draws no card header, and CnDetailWidgetHost only draws a link a widget reports through its `header` event,
which object-table does not do.

## What changes

- CnTabsWidget draws the header link the open tab's widget declares (`headerLink` on the definition, or in its
  content) as a text link beside the strip, before the Actions menu. A route is a router link, an href an anchor,
  the label goes through the host translate.
- The link follows the open tab: another tab shows its own link, or none.
- For a stack (`widgetIds`), the first widget's link.

A tab whose widget declares no link draws nothing new. No manifest schema change.
