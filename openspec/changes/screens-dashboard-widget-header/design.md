# Design: screens-dashboard-widget-header

- The page keeps the last report per widget id. Link order: `headerLink` on the placement, then on the definition,
  then the reported link, then the link read from the content (`headerLink`, `viewAllRoute`) for a widget that never
  reports.
- The note and the action are drawn in the wrapper's `#actions` slot, after the link and before the menu, as
  CnDetailWidgetHost does.
- An unchanged report is not stored again: storing re-renders the card, and a widget that reads on render would
  report for ever.
