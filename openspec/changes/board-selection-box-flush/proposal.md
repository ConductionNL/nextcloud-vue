# Proposal: board-selection-box-flush

## Why

r29 (25 Oct): the selection box stood 7-9px further in than the boards draw it: DqAanMijToegewezen's card box 23px into the card (live 30), DqTeamwachtrij's row box 18px into the row with the lead at 50 (live 59, header.titleInsetLeft 51 vs 59). NcCheckboxRadioSwitch pads its content 7px on each side.

## What changes

In the board look the box in a record card head and in a list row draws without that side padding, and a list row's box starts 18px in. Probed live by injection: card box at 23, row box at 18 and lead at 50, as the boards. No schema change.
