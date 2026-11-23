# Sort and filter from the search's column headers

## Why

DqZoekresultaten draws a sort chevron and a filter button on every header. On live the headers had neither, because a named source without a schema got no header filters and no sort.

## What changes

- The search source makes its columns sortable and asks for header filters (`headerFilters: true`). It also asks the page to order its rows (`sortsRows: true`).
- CnIndexPage shows header filters for a named source that asks for them.
- For a source with `sortsRows`, CnIndexPage keeps the header's order and sorts that source's rows in that order.
