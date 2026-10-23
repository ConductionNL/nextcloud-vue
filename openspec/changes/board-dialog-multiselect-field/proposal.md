# A multiple select in a board dialog is the board's field

## Why

DqFilterDelen draws "Delen met" as a 40px field with a 1px edge. In a board
dialog, NcSelect's multiple select drew a 24px search box inside a toggle
edged by a ring. COMPDIFF r23 measured the field at 24px with no border.

## What changes

In a board dialog, a multiple select draws its 40px, 1px edge on the toggle.
The toggle holds both the chips and the search, so the chosen people and
groups sit inside the field. The search inside it draws no edge of its own.

Focus darkens the edge to the text colour, as NcSelect's own focus does, and
keeps the outline ring that patches.css puts on the toggle (WCAG 2.4.7).

A first version put the edge on the search box and removed the toggle's
border. The review found two problems with it: chosen chips fell outside the
edge, and the toggle lost its focus border.

Checked on :8080 in the share dialog with three chosen sharees:
- all three chips sit inside the 1px rgb(130, 138, 149) edge
- the search draws no edge
- on focus the edge turns rgb(27, 28, 29), with the 2px outline ring
