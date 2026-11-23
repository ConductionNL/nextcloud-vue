---
kind: code
---

# Proposal: board-settings-plain-table-rows

## Summary

r30 DqBeheerGeavanceerd: plain settings tables drew body rows 37.8px against the boards' 42 (line height 1.2 instead of 1.5), and a row header (the prerequisites' first column) took the head's grey ground and muted ink through the theme's th tokens. Body cells now use 1.5 leading; a row header reads as a strong cell.

## Scope

- `src/css/look-board.css`, the plain-table css test.

## Correction (r31)

The 1.5 body leading was wrong: the boards' settings tables set 14px at 1.2 and their 42px rows come from a pill or a button in the row. r31 measured every plain table at 21 vs 16.8. Body cells are back at 1.2; the row-header part stands.
