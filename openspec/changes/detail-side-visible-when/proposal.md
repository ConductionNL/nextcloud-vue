# Proposal: detail-side-visible-when

## Why

Grid widgets and tabs on a detail page honour `visibleWhen` against the record and `@context.caseType`, but the side
column (`config.sideColumn`) drew every entry. The dossiq domain boards DqBezwaar, DqSubsidie, DqHandhaving,
DqSociaalDomein and DqAanbesteding put case-type specific cards in the side column.

## What changes

- A side column entry, inline or a string reference to `widgets`, is left out while its `visibleWhen` does not hold,
  read by the same `detailWidgetVisible` the body grid uses: local fields of the record, `@context.<name>.*` from
  `visibilityContext`, and endpoint/source conditions (asked once per record, like the grid's).
- Edit mode shows every side widget. A side column whose widgets are all hidden is not drawn.
- An entry without `visibleWhen` shows as before.
