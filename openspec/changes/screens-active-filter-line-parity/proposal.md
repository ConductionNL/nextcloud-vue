---
kind: code
depends_on: [screens-index-list-parity]
---

# Proposal: screens-active-filter-line-parity

## Summary

The board toolbar's second row ends in an Active line ("Actief: Pijplijn:
Verkoop ×, Alles wissen") and the Filter button carries the number of chips on
it. The app lanes found three things the library cannot draw yet:

1. dossiq gap 6, pipelinq "Active filter line" and "Filter button": the line
   and the badge only know sidebar facets. A quick-filter chip that narrows the
   list (PqLeads "Open" scoped to the sales pipeline) is invisible there, so
   the badge reads nothing where the board reads 1.
2. dossiq gap 12b: an active filter over a reference shows the id
   ("Zaaktype: 3c0f5a00-...") instead of the name.
3. pipelinq "Sluit deze maand": the filter vocabulary has `@monthStart` but
   nothing for the end of the month, so "closes this month" cannot be written.

## What changes

- A quick filter entry MAY carry `activeLabel`. While that tab is selected the
  Active line shows a removable chip with that text (translated) and the badge
  counts it. Removing it, or Clear all, returns to the default tab. A tab
  without `activeLabel` (an "All" tab) adds nothing, so today's pages do not
  change.
- An active filter value is named: the referenced object's label (resolved the
  way reference columns already are), else the facet bucket label, else the
  schema `oneOf` title, else the raw value.
- Two filter tokens: `@monthEnd` (last day of the month) and
  `@nextMonthStart` (for a datetime field: `lt: '@nextMonthStart'`).

## Reference screens

| Screen | Live board |
|---|---|
| `pipelinq/PqLeads` (Actief: Pijplijn: Verkoop, Filter 1, chip Sluit deze maand) | https://identity.conduction.nl/screens/board?id=pipelinq/PqLeads |
| `pipelinq/PqTickets` (two chips, Filter 2) | https://identity.conduction.nl/screens/board?id=pipelinq/PqTickets |
| `dossiq/DqZaken` | https://identity.conduction.nl/screens/board?id=dossiq/DqZaken |

## Out of scope

- The page's base `filter` (DqZaken's "Status: lopend" reads like one) is not
  a chip: it cannot be removed by the person. An app that wants it on the line
  models it as a default quick filter with an `activeLabel`.
- `quickFilters` is not in the manifest schema (config is open), so
  `activeLabel` is documented on the prop; the schema change is the token
  pattern only.

## Impact

Additive. Schema 2.81.0 (filter token pattern). No change without the board
look, and none on the board look for a tab without `activeLabel`.
