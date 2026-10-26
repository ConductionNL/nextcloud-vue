---
kind: code
---

# Proposal: board-settings-text-buttons

## Summary

r31 verdicts DqBeheerinstellingen: "Uitleg tonen" and "Geavanceerd" read as 40px tertiary buttons with 14px padding and an 8px radius; the boards draw them as 25px text links. In the board look both are 25px, unpadded and square-cornered (still above the 24px target size). Replaces the -8px margin the hints toggle had.

## Scope

- `src/css/look-board.css`, the first-line css test.

Also: a card's footer link sits 16px under the content in one 14px line (r31 DqVthInstellingen: Activiteiten and Legesregels each 20px taller).
