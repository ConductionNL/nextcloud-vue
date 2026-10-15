# Proposal: screens-board-reference-columns

## Why

Board DqWerkbord draws dossiq's Werkbord as the "Alle zaken" list in board view: filter chips, a Filter button,
search, a "Zaaktype:" select, a "Kolommen: status | type | behandelaar" switch and cards with title, number,
requester, type pill, term and avatar.

The library board could not back that page. It reads its columns from the status field's `enum` or lifecycle
`states`. A case's `status` is neither: it references a statusType row, and every case type has its own rows. So
dossiq kept an app component (`WorkflowBoard.vue`) and its own move dialog. The PR body of dossiq #3937 names this gap.

## What changes

- `config.board.columnFields`: the fields the columns can come from. A field with a `source` takes its columns from
  the rows it references, ordered by a field, merged by name, narrowed to one parent. `kind: "values"` takes the
  values present plus a column for no value.
- A column switch ("Columns:") and a narrowing select after the search, and a hint sentence.
- A drop writes the reference: through a named `moveHandler` from the app's registry (the app's transition), or a PATCH.
- `moveTargetsHandler`: where one card may go. Other columns fade during a drag, read "not allowed" in the card menu,
  and refuse a drop.
- Cards can be selected, so the bulk band works on the board.
- `wrap`: the columns wrap onto more rows.
- `config.board` on an index page is typed by `boardView`. Manifest schema 2.97.0.

A board without `columnFields` renders and moves exactly as before.
