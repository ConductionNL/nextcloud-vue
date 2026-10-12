---
kind: code
---

# Proposal: screens-start-here-banner

## Summary

PqMijnWerk (and DqMijnWerk's "Eerst vandaag") has a card that names ONE record: "Begin hier: Afvalpas werkt niet bij de
container, M. de Graaf has waited 3 days", with the action "Nu beantwoorden" that opens it. The attention card of
`banner` can say how many rows match a query (`visibleWhen`, `{value}`) but cannot name a row.

The existing mechanism does the rest: the attention card, `visibleWhen` with a `source` (collapses the cell when
nothing matches), actions with routes. This change gives it the row:

1. `visibleWhen.source.order`: the first result is the first of an ordered query.
2. The card keeps that first row as its subject. `{subject.<field>}` (with `|date` and the new `|days`) in kicker, title
   and reason, and `@subject.<field>` in an action route.
3. `stacked: true`: the board's column layout, 16px title, the action under the text.

## Scope

CnBannerWidget, readVisibleWhenValue (an optional sink), CnDashboardPage (hands the row on), fillTemplate (`days`);
docs; tests; harness e2e. Opt-in. Manifest schema bump.
