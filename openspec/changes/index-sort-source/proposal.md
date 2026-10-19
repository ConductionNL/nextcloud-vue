# Proposal: a sort option can take its rows from an endpoint

## Why

dossiq's "Aan mij toegewezen" orders a handler's cases by urgency. The server computes urgency per request from the deadline, the priority and how long a case has been idle, so OpenRegister cannot sort by it. Today a custom wrapper component (MyWorkCards, about 1.2k lines) fetches the ranked rows itself, then searches, filters and pages them by hand, and draws its own cards so it can show the urgency tier. An index page could not do any of this from config.

## What changes

- A `sortSelectOptions` entry may name a `source`: `{ url, params?, rowsPath?, rowPath?, carry?, idPath?, annotate?, searchFields?, failedNote? }`.
  - Choosing that option lists the endpoint's rows, in the endpoint's order.
  - The page's own search box, sidebar filters and pager run over those rows in the browser.
  - `default: true` opens the page on that option, unless the address already carries an order.
- If the endpoint fails, the list falls back to the option's `order` (self-fetched) and shows the `failedNote`.
- `carry` copies fields from each endpoint entry onto its row, such as `deadlineTier`. A card-layout pill reads them like any other field.
- With `annotate: true`, the carried fields also reach the rows of every other order, matched on `idPath` (default `id`). So a tier pill still draws when "Newest" is chosen.
- The manifest schema moves to 2.129.0 and declares `sortSelectOptions`.

## Impact

Pages that don't name a source are unchanged. The card part needs no new key: `cardLayout.headPill: { field: 'deadlineTier', colorMap, labels }` reads the carried field.
