# Proposal: table-sorted-column-label-ink

## Why

The boards draw the sorted column's header label at full text colour and every other header in the secondary text
colour (DqZaken "Termijn", DqContacten and DqOrganisaties "Naam", DqFilterInMenu "Termijn"). The table only gave the
sorted column's chevron the full colour, so the label read the same as an unsorted one.

## What changes

`table.css` draws the sort button of a header with `aria-sort="ascending"` or `"descending"` in
`--color-main-text`. Unsorted headers keep inheriting the header's secondary colour.

## Reach

Every CnDataTable with an active sort. No props, no schema change.
