# Design: abstract-field-list-table

- `variant: "table"` needs at least one column; without columns the list rows stay. A column is
  `{ header, path, map?, format?, strong?, pill?, variantMap? }`: the cell reads the entry like a row part; `pill` draws
  a CnStatusBadge from the mapped value; `strong` makes the cell bold (the first column).
- The per-row menu is an NcActions (always a menu) named "More actions: <row title>". It holds the row actions that are
  not `placement: "band"`, then remove. No actions and no remove: no menu column.
- `row.detail` is drawn once per matching row as a warning band under the table (amber border and tint from
  `--color-warning`), with the row's actions marked `placement: "band"` as buttons. In the list variant `detail` stays
  a muted line under the row.
- `add.trigger: "button"` hides the form behind a "+ label" button (header: above the rows, footer: below); a
  successful add closes it. Without a trigger the form is always visible, as before.
- Write path, tokens, `rowSource` and errors are untouched.
