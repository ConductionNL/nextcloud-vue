# Proposal: object-list-add-actions

## Why

Board PqOfferte's "Regels" card offers two ways to add a line ("Product toevoegen" and "Eigen regel toevoegen") and ends
its table with the catalogue note on the left and a totals box on the right (Subtotaal, Btw, Totaal). An object list has
one Add, and only a footnote or a count line under its rows.

## What changes

- `content.addActions`: extra adds beside the list's own, each opening the same create form with its `createDefaults`
  merged over the list's. The host draws them next to the catalog Add (board title row, or the Actions menu) and the
  widget in its footer bar.
- `content.totals`: rows read from the record the list sits on, drawn in a box beside the footnote; `format: "currency"`
  and `emphasis` for the total.

Without the keys nothing changes. No schema change (widget content is open).
