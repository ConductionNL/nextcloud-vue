# Proposal: list-counts-in-one-request

## Why

Demo film sweep (23 Nov, :8076): dossiq's case list counts its 13 saved views and 20 quick filters through the list
endpoint, one `_limit=1` request each. The browser opens at most six connections to the host, so those 29 count
requests queued in front of the list's own request: the list took 1.7 s to arrive and the counts up to 2.7 s. Each
count costs a full Nextcloud request (~250 ms) for a query of a few milliseconds.

OpenRegister already answers many counts in one request: `POST /api/objects/counts` builds each count with the same
search query the list endpoint builds from its query string, under the same access rules. On the stack the 29 counts
took 422 ms as one batch against 4.2 s as single requests, with identical numbers.

## What changes

`fetchListTotals(lists, ctx)` counts two or more lists in one `POST /api/objects/counts`. Each filter is sent as the
structure the list request's query string arrives as in PHP (`field[lt]` nested, `field[]` as a list, values as
strings), so a count and the list cannot disagree. One list keeps its own list request. When the batch fails or
answers the wrong number of results, every list falls back to its own list request.

The list-endpoint counts of `fetchFilterCounts` (`via: 'list'`, list values, null tests, operator keys), CnIndexPage's
page-tab and header-meta counts, and CnDetailPage's header-meta and pill counts use it. Aggregation-endpoint counts are
unchanged.
