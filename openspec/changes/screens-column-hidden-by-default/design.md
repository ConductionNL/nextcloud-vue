# Design: screens-column-hidden-by-default

- `isHiddenByDefault(column)`: a column object with `hidden === true`. A bare key string is never hidden.
- Self-fetch: `configuredColumnKeys` (the seed of `useListView`'s `visibleColumns`) skips hidden columns, so the
  Columns tab shows them switched off and switching one on adds it to the set.
- `tableColumns`: with no visible set, hidden columns are dropped; with a set, a hidden column shows only when the
  set names it, whether or not the sidebar governs it. Other columns keep their rule.
- A saved personal layout or an applied view's columns is the visible set, so the person's choice wins.
