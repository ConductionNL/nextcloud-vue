# The task table head at the board's height

## Why
r29 (25 Oct, with the head sort/filter live): DqZaakTaken's table head measured 55px against the board's 42.5. The filter funnel kept NcActions' 34px trigger, and the task name had no claim on the spare width, so names wrapped early (rows 79 vs 64).

## What changes
This is board-look CSS on the record task table:
- the head's filter trigger is 22px;
- the task name column takes the spare width;
- the handler cell stays on one line.

With the CSS injected on :8080 the head reads 43px. No schema change.
