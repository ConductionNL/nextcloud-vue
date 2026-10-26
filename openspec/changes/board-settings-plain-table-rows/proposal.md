---
kind: code
---

# Proposal: board-settings-plain-table-rows

## Summary

r30 DqBeheerGeavanceerd: plain settings tables drew body rows 37.8px against the boards' 42 (line height 1.2 instead of 1.5), and a row header (the prerequisites' first column) took the head's grey ground and muted ink through the theme's th tokens. Body cells now use 1.5 leading; a row header reads as a strong cell.

## Scope

- `src/css/look-board.css`, the plain-table css test.
