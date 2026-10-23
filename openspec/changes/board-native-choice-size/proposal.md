# Proposal: board-native-choice-size

## Why

The boards draw a native radio or checkbox 18px square in the primary colour (95 inputs across the Dq boards). Live
draws the browser's 13px radio, stretched to 13x36 by Nextcloud's input height, in the option cards of DqVolgendeStap,
DqBesluit, DqDocumentGenereren and DqInstellen (COMPDIFF r21 after the tool fix: toggle `18>13`).

## What changes

In the board look a native radio or checkbox is 18px square with the primary colour as its accent. The input inside
NcCheckboxRadioSwitch, hidden behind its icon, keeps its own box.

## Scope

Board-only, `look-board.css`. Ten board inputs draw 20px; they are not changed.
