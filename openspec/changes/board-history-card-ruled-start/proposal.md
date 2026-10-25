---
kind: code
---

# Proposal: board-history-card-ruled-start

## Summary

Board DqTaak draws the side card "Historie" as a list that opens on its first row's hairline, 6px under the title. The
row's 12px padding comes after that hairline, so the first action is 19px under the title. In r29, live put it 22.8px
under the title, because the detail card's content keeps its 9.75px top padding (12px minus the first line's leading)
above a list that brings its own rule and padding.

## Scope

- `src/css/look-board-detail.css`: in the board look, a detail card whose content opens on a stacked audit row has a
  6px top padding.
