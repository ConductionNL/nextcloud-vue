---
kind: code
---

# Proposal: table-header-sort-and-filter

## Summary

Every table header sorts and filters, fleet-wide (Ruben's pipelinq review of
2026-10-06, item G2).

- Every column backed by a schema property sorts by default, including
  object-form manifest columns (`{ key, label }`). `sortable: false` opts out.
- Every such column gets a filter button in its header. The panel fits the
  column: checkboxes for an enum, yes/no/any for a boolean, from and to for a
  number or a date, a searchable list for a reference, equals for text.
  `filterable: false` opts a column out, `headerFilters: false` a page.

## Motivation

Ruben asked for "every table header sortable and filterable". Today a
manifest column written as `{ key, label }` has no `sortable` flag and cannot
sort at all, and there is no filter in a header anywhere. The facet sidebar
can filter, but it sits away from the column the person is looking at.

## Affected projects

- [ ] `nextcloud-vue`: `CnDataTable` (`filterable`, `activeFilters`,
      `filterRegister`, `column-filter` event, chips), new
      `CnColumnFilterPopover`, `src/utils/columnFilters.js`, `CnIndexPage`
      (`headerFilters`, default on).
- [ ] Fleet: no change needed. Index pages pick it up on the next library bump.

## Design notes

**One filter state.** A header filter writes into the active-filter map the
facet sidebar already writes (`{ paramKey: values[] }`). The fetch, the route
query persistence and saved views therefore need nothing new, and a sidebar
filter and a header filter on one field show the same state.

**OpenRegister's own parameters.** Equality is `key=value`, any-of is
`key[]=a&key[]=b`, a range is `key[gte]` and `key[lte]`. A date-time column
is queried up to `T23:59:59` of the picked "to" day.

**Text is equals, not contains.** OpenRegister has no contains operator on
schema properties (its property filter knows `gte`, `lte`, `gt`, `lt`, `in`,
`notIn`, `ne` and `isnull`). Sending one would be silently ignored, which
reads as a broken filter. The text panel therefore says "Equals". Contains
needs an OpenRegister change first; the search box keeps covering it.

**Only what the server can answer.** With a schema, a column sorts and
filters when a stored property backs it. A computed column (`aggregate`,
`compute`) or a widget column without a property does neither. Without a
schema, sorting stays opt-in as before, because nothing says the host sorts.
Metadata columns (`created`, `updated`) stay unsortable: OpenRegister sorts
them as `@self.created`, not under the column key.

**Accessible.** The filter button is a real button with an `aria-label`
("Filter Status", "Filter Status, active") and `aria-expanded`. The panel is
a labelled dialog of native inputs, Escape closes it and focus returns to the
button. An active filter shows as a filled icon (not colour alone) and as a
chip with a labelled remove button.
