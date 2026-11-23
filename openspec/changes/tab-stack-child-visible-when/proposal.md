# Proposal: tab-stack-child-visible-when

## Why

Board PqContactmoment shows the contact-moment card in a ticket's tab only on interaction tickets. The card is a widget
in a tab stack (`widgetIds`). #1691 made a stack child follow a workspace `visibleWhen` on dashboards, but on a detail
page a stack child ignored its own `visibleWhen`, so the card showed on every ticket. A grid widget with the same
condition hides.

## What changes

- On a detail page a widget in a tab stack follows its own locally decidable `visibleWhen` against the record and
  `@context`, through the same evaluator as grid widgets (`detailWidgetVisible`), hidden while the context records load.
- Without a record (dashboards) and for conditions that need a request, nothing changes.
