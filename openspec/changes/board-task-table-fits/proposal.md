# The board task table fits its card

## Why
DqZaakTaken (r25b, 24 Oct): the task table was 843px wide in a 798px card, so Afronden was cut off at the edge. A long
task name stayed on one line, and the row's task menu wrapped under Afronden, which made the open row 97px tall
(board 64).

## What changes
In the board look, a task name and its line wrap under themselves, and a row's button and task menu stand on one line.
Measured with the CSS injected on :8080: table 798 wide, rows 65, and 83 for the row whose name wraps. No schema change.
