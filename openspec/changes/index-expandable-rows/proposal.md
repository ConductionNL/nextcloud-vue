# Proposal: index-expandable-rows

## Why

Board PqPipelines lists each pipeline as a full-width row. Closed, a row shows the name, a "Standaard" badge, the description, the stages as coloured chips joined by ">" and a meta line. Open, the chips give way to a table of the stages (order, name, chance bar, start stage, closed, result pill) with a note and an "Add stage" action. Edit and the row menu sit on the right. The index page had no view that opens a row to a list inside the object.

## What changes

- New component `CnExpandableRow`: one row that opens to a sub-table, configured by a layout (`title`, `badge`, `description`, `chips`, `meta`, `table`, `buttons`).
- CnIndexPage `expandableRows` (manifest `config.expandableRows`): in the list view every row is a `CnExpandableRow`; `open: first` opens the first. A header button or the footer action names a row action by id and runs it as the row menu would; an id that is no row action is emitted as `action`.
- Sub-table columns: `as` is `text` (default, or `template`, `strong`), `order` (the position), `bar` (a 0–100 value as a bar and a percentage), `check` (a mark and `text` while the value holds), `yesNo`, or `pill` (the first `tones` entry whose `when` holds gives text and variant).
- Chips and pill tones read a visibleWhen condition on the list entry.
- Schema 2.160.0 (renumber at merge).
