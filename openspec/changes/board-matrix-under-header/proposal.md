# A board matrix starts under the card header

## Why
r36 DqProcesanalyse "Dagen per fase": the matrix heads sit 40.9px under the title, the board 37, so the card is 4px taller and every card under it moves down. The HTML chart body's 4px start is meant for a bar list; a matrix's column heads already pad 6px above their text.

## What changes
- look-board.css: an HTML chart body that holds a matrix has no top padding. Bar lists keep 4px.
