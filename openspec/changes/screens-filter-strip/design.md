# Design: screens-filter-strip

- Values: `options`, else the field's schema enum. First pill "All" (`allLabel`).
- Picking a value sets the page filter on the field (the same path as the filter sidebar, so it shows in the active
  filter chips and the URL); All clears it.
- Counts (`showCount`): one grouped count request on the field plus one total, narrowed by the page filter and the
  active quick filter tab. They are read again when the tab, the page filter or the list total changes.
- The label and the count are separate spans with a space, so the pill's accessible name reads "E-mail 2".
