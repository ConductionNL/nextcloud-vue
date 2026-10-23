# Proposal: board-setup-choice-radio

## Why

The setup wizard's choice cards draw their radio 20px square in the primary colour (DqInstellen "Voorbeeldgegevens
laden", "Leeg beginnen"). Live it is the browser's 13px radio, stretched to 13x36 by Nextcloud's input height. COMPDIFF
r23: toggle `h 20>13` on DqInstellen. The 18px rule for other native radios (board-native-choice-size) does not match
this board.

## What changes

In the board look a CnChoiceCards radio inside a setup step is 20px square with the primary accent colour.

## Scope

Board-only, `look-board.css`. No schema change.
