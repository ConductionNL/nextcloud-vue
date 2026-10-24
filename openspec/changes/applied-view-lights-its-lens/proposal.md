# Proposal: applied-view-lights-its-lens

## Why

DqFilterInMenu on :8080 (24 Oct, r25b): with Pieter's view "Termijn deze week" applied, the strip still lit "Alles" and
the line under the title read "2 van 2 lopende zaken in uw teams · gesorteerd op termijn". The board lights the "Termijn
deze week" chip and names the view's conditions: "3 van 48 lopende zaken · termijn binnen 7 dagen, van mij · gesorteerd
op termijn".

## What changes

- While a saved view is applied, the strip lights the non-default lens whose every condition the view's conditions
  (filters over locked filters, tokens as written) hold, the most specific first, until the reader picks a chip. The
  fetch is unchanged; the chip is what the view already narrows within.
- `savedViewCountText` (page config): the count line while a view is applied, with `{view}` for the view's description
  or, without one, its filters in words. A view's own `countText` override and a scope's come first.
