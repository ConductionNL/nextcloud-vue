# Proposal: board-settings-list-rows

## Why

COMPDIFF pl6 PqBeheer: the Vaardigheden and Medewerkerprofielen rows sat 38px in from the card edge, against 25 on the
board. pipelinq draws each row as its own bordered box with 16px padding. The boards draw these lists flat: rows flush
with the card's title and a hairline below each (PqBeheer skills, agent profiles and product categories), as the Dq
boards draw their lists.

## What changes

- In the board look a list an app draws on a settings card opts in with `cn-settings-list` on the list and
  `cn-settings-row` on each row. The list stacks its rows without a gap; a row is flat, 10px top and bottom, flush left,
  with a hairline below.
- The Nextcloud look is unchanged.
