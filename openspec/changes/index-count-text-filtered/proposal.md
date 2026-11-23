---
kind: code
---

# Proposal: index-count-text-filtered

## Summary

A list opened on one slice of its records, such as the messages of one sending from a link with `?sendingRef=…`, has
to say how that slice is doing: "18 of 24 read". The count line could name count values (`countValues`, which already
follow the address's filters), but only in the board look and always, also on the unfiltered list where "of all
messages ever sent, n read" says nothing.

## Scope

- `src/components/CnIndexPage/CnIndexPage.vue`: `countTextFiltered` (manifest `config.countTextFiltered`), the count
  line while a filter narrows the list (an active filter from the address, the side panel or a filter strip, or a
  selected quick filter tab with a filter), in either look, with the `countText` tokens.
- Docs: `cn-index-page.md` (a worked example with a count value and the facts row that links to the filtered list),
  `CnIndexPage.md`.

## Consumer

portaliq inbox-read-receipt-on-request T06: PortalMessages reads "{read} of {total} read" under a `sendingRef` filter.
T05 needs no library change: the facts widget already shows `emptyValue`, a `when` row and a row `route` with a query,
and the audit trail's `changeLabels` words the `readAt` change.
