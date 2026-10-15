---
kind: code
---

# Proposal: board-week-strip-fits

## Summary

dossiq's "Termijnen deze week" (CnWeekStripWidget) at 1100 wide holds 680px of days in a 494px card and scrolls sideways inside it. Each day is at least 128px, and the days never wrap.

Under the board look a row now holds as many days of at least 120px as the card fits (`repeat(auto-fit, minmax(min(100%, 120px), 1fr))`), and the days that do not fit wrap to the next row: three and two in the 494px card. 120px keeps a case title's words whole. At 88px five days fitted one row, but "Bezwaar" broke mid-word. A wider card draws them as before: one row of equal columns, as wide as before. A day's head lets its "today" badge wrap under the label when the day is narrow.

## Scope

- `src/css/look-board.css`, scoped under `.cn-look-board` with the page guard. Without the board look the strip is unchanged and still scrolls.
- No component or schema change.
