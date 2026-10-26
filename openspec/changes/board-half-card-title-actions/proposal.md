# Proposal: board-half-card-title-actions

## Why

COMPDIFF r25 on DqVthInstellingen: "Checklist toevoegen" stands under the "Inspectiechecklists" title, where the board
draws it at the end of the title row. The card is half the page wide (550px, about 504px inside), and the board look
dropped card head buttons under the title in any card under 520px.

## What changes

- Card head buttons drop under the title only in a card under 400px (a phone), so a half-width card keeps them in the
  title row (DqVthInstellingen "Inspectiechecklists", DqInstellingenAlgemeen "Werkdagen en feestdagen").

## Scope

look-board.css. No schema change.
