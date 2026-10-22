---
kind: code
depends_on: [screens-active-filter-line-parity]
---

# Proposal: index-filter-labels

## Summary

An index page already takes its filters from the address (`?isFinalStatus=false`,
`?dueAt=2026-10-01..2026-10-31`) and writes them back, so a filtered list can be
shared as a link. The Active line then names those filters badly:

1. A filter on a field whose schema title and values are technical reads as
   such: "Is Final Status: false" on dossiq's cases, where the board draws
   "Status: lopend".
2. A range reads as two chips with raw keys ("deadline[gte]: 2026-10-01",
   "deadline[lte]: 2026-10-31"), or, on a named source with a date-range
   field, as "dueAt: [object Object]". The board draws one chip, "Deadline: 1
   tot en met 31 oktober".

## What changes

- A page MAY declare `filterLabels`: per filter key a `label` for the field and
  `values` naming each value. Both go through the app's translate. They win over
  the schema title, the sidebar field title and the value labels below.
- Without `filterLabels`, a named source's chip takes the field title and
  `enumLabels` from its `sidebar.fields`, as the filter panel does.
- A range is one chip: a `{from, to}` value and a `key[gte]`/`key[lte]` pair
  (or `gt`/`lt`) both read "{from} through {to}", "from {from}" or "up to {to}".
  Dates are written in the person's locale, the month once when both ends
  share it ("1 tot en met 31 oktober"). Removing the chip clears both ends.

## Reference screens

| Screen | Live board |
|---|---|
| `dossiq/DqZaken` (Actief: Status: lopend) | https://identity.conduction.nl/screens/board?id=dossiq/DqZaken |
| `dossiq/DqTaken` (Actief: Deadline: 1 tot en met 31 oktober) | https://identity.conduction.nl/screens/board?id=dossiq/DqTaken |
