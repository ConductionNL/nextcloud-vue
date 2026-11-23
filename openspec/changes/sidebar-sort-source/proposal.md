# Proposal: a sidebar sort option can take its rows from an endpoint

## Why

dossiq's "Aan mij toegewezen" orders a handler's cases by urgency. The server computes urgency per request from the deadline, the priority and how long a case has been idle, so OpenRegister cannot sort by it. A custom wrapper of about 1.2k lines fetches the ranked rows and searches, filters and pages them by hand. Sorting now runs through the index sidebar's Sort section, which works on sort keys (batch 16, sidebarSort). An endpoint-ranked order is not a list of keys, so the section could not offer it.

## What changes

- A `sortSelectOptions` entry may name a `source`: `{ url, params?, rowsPath?, rowPath?, carry?, idPath?, annotate?, searchFields?, failedNote? }`.
  - The Sort section offers it as an order of its own (`fixed`), chosen by its value, with no direction.
  - Choosing it lists the endpoint's rows in the endpoint's order. The page's search, sidebar filters and pager run over them in the browser.
  - `default: true` opens on it unless the address carries an `_order`.
  - Ordering by keys leaves it: a column header click in the table view, or another field in the Sort section.
  - When the endpoint fails, the list falls back to the option's `order` and shows `failedNote`.
- `carry` copies fields from each entry onto its row, and `cardLayout.headPill` reads them. With `annotate: true`, the carried fields reach every other order's rows as well.
- CnIndexSidebar:
  - takes `currentSortValue` and options with `fixed: true`;
  - emits the chosen option's value beside the keys.
- CnIndexPage `selectSortOption(value)` chooses an option by its value, so a saved view's `sortOption` can pick it.
- The manifest schema moves to 2.131.0 and declares `sortSelectOptions`.

## Impact

A page that names no source keeps its Sort section as before.
