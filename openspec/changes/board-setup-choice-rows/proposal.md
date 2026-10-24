# Proposal: board-setup-choice-rows

## Why

COMPDIFF r25 on DqInstellen (setup wizard, "Voorbeeldgegevens"): the chosen option is drawn with a 1px border and a 1px
inset shadow where the board measures a 2px border and no shadow, and every option carries an icon the board does not
draw. (The chosen option's tint is fix/board-choice-row-chosen-white, which this stacks on.)

## What changes

- In the board look a setup step's chosen option has a real 2px border, no inset shadow, and 1px less padding so the
  words stay put.
- A setup step's options draw no icon in the board look.

## Scope

look-board.css. No schema change.
