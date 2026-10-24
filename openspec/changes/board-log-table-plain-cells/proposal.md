# A log table in a card reads as plain text

## Why

DqZaakContact draws the case's contact moments as a plain log: the date with
its time ("5 okt, 09:15") in regular weight, the channel as an icon before its
name ("E-mail" with an envelope), the direction as a pill. Live drew the date
as the list page's 600-weight underlined title link with the date alone
("9 okt"), and the channel as a grey pill. COMPDIFF recorded
`cell.fontWeight 400>600` on that table.

## What changes

- CnDataTable `rowTitle: "text"`: in the board look the title column reads as
  an ordinary cell (weight 400, no underline, the cell's 14px). The row stays
  clickable through its row link. CnObjectListWidget passes `content.rowTitle`.
- CnCellRenderer `date` widget `widgetProps.short: true`: the board's short date
  ("5 okt", "14 feb 2024" outside this year), with `showTime` followed by the
  time ("5 okt, 09:15").
- CnCellRenderer `iconLabel` widget `widgetProps.icons`: a map from the stored
  value to an icon name, for an enum column whose icon depends on the value.
