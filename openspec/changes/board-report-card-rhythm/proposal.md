---
kind: code
---

# Proposal: board-report-card-rhythm

## Summary

DqTermijnen draws its two report cards (Kwartaalrapport, Jaarlijkse
dwangsomaudit) as one column: the form, the table, the summary line and the
data-warnings figure, 12px apart. Under the board look three parts drew taller
than that:

- the workspace filter label at 1.5 line height, 4px over its field (65px, the
  board 63);
- a stacked summary list kept the dashboard list's 10px bottom padding on top
  of the sections' gap;
- the data-warnings stat drew as a padded tile inside the card (91px, the
  board 54).

Only plain sections (`dividers: false`) on a board dashboard change. Outside
the board look nothing changes.
