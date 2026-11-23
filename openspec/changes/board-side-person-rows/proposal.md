---
kind: code
---

# Proposal: board-side-person-rows

## Summary

Board DqSociaalDomein draws the side card "Wie" as rows of a 28px initials circle with the person 8px after it, in
regular weight. In r29, live stacked each side row into a column (the library's narrow side rule), which put a 36px circle
above the name: five flags on the card.

## Scope

- `src/css/look-board-detail.css`: in the board look, a side list row with initials keeps one line, with a 28px circle,
  an 8px gap and the text in regular weight. Probed on :8080 with the rules injected, together with dossiq's
  `density: "stacked"`: circle 14px under the title, text 59px in.
