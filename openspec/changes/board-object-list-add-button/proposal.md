# The board look draws a list card's Add as a title-row button

## Why

The boards draw a list card's Add ("Deelzaak aanmaken" on DqZaakGerelateerd,
"Toevoegen" on DqZaakTaken) as a neutral 40px secondary button, right-aligned
in the card's title row: 21px below the card's top, its right edge on the
card padding. Live drew ADR-062's footer bar: a wide tertiary 34px button
pinned to the card's bottom, plus the same Add in the card's Actions menu
(COMPDIFF r24 h 40>34, x and y off). The boards are canon in the board look
only, so the Nextcloud look keeps ADR-062's bar.

## What changes

- CnDetailWidgetHost: in the board look, a catalog card's Add is a
  `variant="secondary"` NcButton in the title row (`catalogAddInHeader`)
  instead of an Actions menu item (`catalogAddInMenu`). In a tab panel and in
  the Nextcloud look nothing changes.
- look-board-detail.css: the list's footer Add is hidden in a board-look
  catalog card, and the title-row Add takes the 40px control height.
