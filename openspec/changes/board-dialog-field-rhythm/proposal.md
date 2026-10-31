# Proposal: board-dialog-field-rhythm

## Why

COMPDIFF r39 measured DqNieuweZaak's "Aanvrager" suggestions 17.6px below the board. Three things added up. The body's
1.5 leading put 4px over every field label and 4px under every help line. NcSelect's own 6px top margin set the search
select 6px below the select beside it. The board sets labels and help lines on the font's own leading and keeps the
fields of a row level.

## What changes

In a board dialog, a field's label, its optional note and its help line use `line-height: normal`. A search select
(the party picker) drops NcSelect's block margin, as a plain select already does. The Nextcloud look is unchanged.
