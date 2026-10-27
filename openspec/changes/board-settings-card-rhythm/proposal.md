---
kind: code
---

# Proposal: board-settings-card-rhythm

## Summary

r32 DqBeheerinstellingen: every settings card ran 18 to 30px taller than the board, so each card below sat further down (+25 to +124px). Causes, read on :8080: the save row's 4px margin and 14px padding on top of the form's 16px gap; radio options 61px apart (board 49) with the description under the 34px hit area; selects 86px apart (NcSelect's 44px toggle with 22px/4px margins; board 79); text fields 82px apart; the sub-heading's 8px margin and 24px line; the switch row 20px after the -8px fix (board 36); hints 3px under the control. In the board look: save row 0/0; radios -8px with the description 2px under the label and 30px in; selects 23px/-4px; text fields 22px/-3px; legend 3px; heading margin 0, 1.3; switch -8px/10px; hints 3px, 13px/1.45. Verified with the CSS injected on :8080: card tops 251/732/972/1207/1746/2315/2681 against the board's 252/735/975/1209/1747/2314/2680.

## Scope

- `src/css/look-board.css`, css tests (three updated to the new values).

Also: the register mapping's board Save is ready to press like the other settings cards (it sends nothing when nothing changed).
