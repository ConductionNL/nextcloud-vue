# record-list-table-shape

## Why

Learniq draws five tables as custom code because the record list table could not take its shape from the rows: a
department tree indented by depth, coverage per regulation the reader sorts and colours red, amber or green, an AI
feature verdict that may only read green when the locality is verified, and course feedback whose rows are the free
text answers inside each response.

## What changes

- `indentPath`: the first cell moves in 16px per level of the row's depth.
- `columns[].sortable`: the header is a button that sorts the rows up, then down, numbers as numbers, with `aria-sort`.
- `columns[].tone`: the cell is a coloured label, the variant picked by a map over the cell or another field, and
  `override: { when, tone }` replaces it while a condition over the row holds.
- `flattenPath`: each entry of a list inside a record is a row, the record at `@parent`.
- With `rowRoute` the first cell links to the row's page.
