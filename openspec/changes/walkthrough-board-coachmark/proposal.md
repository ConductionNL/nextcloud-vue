---
kind: code
---

# Walkthrough coachmark in the board look

## Why
Board DqRondleiding draws the tour as a wide welcome card with "Stap 1 van 6", a row of dots and a footer under a hairline. CnWalkthrough drew one narrow card with "1 / 6" in every app, and its close label had no Dutch.

## What changes
- CnWalkthrough takes the look (`look` prop, else `cnLook`). Under the board look the counter names the step in words, the footer draws one dot per step, and a step without a target opens as a 560px card near the top of the page.
- The default look is unchanged.
- "Close tour" gets its Dutch string.
