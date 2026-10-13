# Design: screens-quick-filter-sort

- `quickFilters[].sort` is `{ key, order }` or a list of those. `order` is `asc` (default) or `desc`.
- On mount, the active lens's `sort` orders the first fetch, unless the route carries an order (a deep link wins).
- On a lens switch (single mode), the new lens's `sort` becomes the list's sort keys. Leaving a lens with a `sort`
  for one without goes back to the page's `sortKeys`, or else to `sortKey`/`sortOrder`. Between two lenses without a
  `sort`, the order is left alone, so a column the person sorts by stays.
- Multiple mode (`quickFilterMultiple`) ignores `sort`: several lenses can be on at once, so none owns the order.
