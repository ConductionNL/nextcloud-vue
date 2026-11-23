# Proposal: board-stacked-list-as-drawn

## Why

COMPDIFF r33, DqDagAfsluiten "Morgen eerst" (a stacked record list): the card was 188px against 195, which put "Hoe dit
werkt" 8px high. The due line under each title used the 1.5 line height (19.5 against the board's 15), the footer link's
8px top padding did not move it because the link is inline (it overlapped the last row), and the list ended 10px under
the link against the board's 20.

## What changes

In the board look, a stacked dashboard list sets its due line at normal leading, draws its footer link as a block 10px
under the last row, and pads 20px under it when it has one.
