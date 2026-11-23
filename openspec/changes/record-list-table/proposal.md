# record-list-table

## Why

Board DqTeamwachtrij draws "Werkvoorraad per zaaktype" as a small table: Zaaktype, Open and Wacht under a header row,
the numbers right-aligned, Wacht bold red when above zero, and a note under it. The record list could only draw rows
of text ("92 open · 73 wacht").

## What changes

- `presentation: "table"` with `columns: [{ label, value, align?, alertAbove? }]`: a header row and one cell per
  column, `value` a template over the row, `align: "end"` right-aligns, a number above `alertAbove` reads bold in the
  danger colour.
- `footnote`: a muted note under the list, in any presentation.
