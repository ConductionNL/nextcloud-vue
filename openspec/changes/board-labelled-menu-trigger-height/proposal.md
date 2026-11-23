# Proposal: board-labelled-menu-trigger-height

## Why

The boards draw a labelled menu button ("Acties", "Meer") 40px tall in some places and 34px in others (DqTenant and
DqAfdelingen `h 40>34`, DqZaaktype `h 34>40`). The coordinator settled it at 40px everywhere, matching the header
buttons beside it. Live draws 34px in a card header and in the tab strip, 40px in a page header.

## What changes

In the board look a labelled menu button (NcActions trigger with text) takes the 40px control height, also in the tab
strip, whose own rule set 34px. An icon-only menu, a row's "...", keeps its size.

## Scope

Board-only, `look-board.css`.
