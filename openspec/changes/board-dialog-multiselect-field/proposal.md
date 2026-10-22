# A multiple select in a board dialog is the board's field

## Why

DqFilterDelen draws "Delen met" as a 40px field with a 1px edge. In a board
dialog, NcSelect's multiple select drew a 24px search box inside a toggle
edged by a ring. COMPDIFF r23 measured the field at 24px, with no border.

## What changes

In a board dialog, a multiple select takes the 40px field height through its
clickable area, and its search box takes the edge the dialog gives every
field. The toggle drops its own ring. Measured on :8080 by injecting the rules
into the share dialog: the field is 40px with a 1px rgb(130, 138, 149) edge.
