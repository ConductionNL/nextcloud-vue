# Proposal: table-strong-title

## Why

DqZaaktypeStatussen draws the name column of the Statussen and Resultaten tables as 14px names at weight 600 in the main
ink, a status name with its list colour as a dot before it. Live drew the board look's title column: a 15px underlined
link, no dot. The swatch format could draw the dot but read the colour field as a CSS colour, and a status stores a
palette name (`blue`, `teal-light`).

## What changes

- CnDataTable / CnObjectListWidget `rowTitle: "strong"`: in the board look the title column is the cell's 14px at 600
  in the main ink, without an underline; the row stays a link.
- CnCellRenderer swatch `format.colorMap`: maps the stored colour field value to a CSS colour; an unmapped value draws no
  dot.
