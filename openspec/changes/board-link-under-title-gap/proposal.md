# Proposal: board-link-under-title-gap

## Why

COMPDIFF r33, DqDashboard "Zaken die u volgt", "Vastgelopen zaken", "Recent geopend": the boards wrap "Alles bekijken"
under the card title, 10px under it at the font's normal line height. Live set the link 2px under the title at 21px, so
the rows started 42px under the title against 46.

## What changes

In the board look, a dashboard card's header link with `placement: "title"` is set at normal line height with 8px above
it (plus the title stack's 2px gap).
