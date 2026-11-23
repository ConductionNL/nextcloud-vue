---
kind: code
---

# Proposal: board-index-wrap-cell

## Summary

Board DqTaken draws task titles and subjects over two or three lines ("Bezwaarschrift aanvullen bij de indiener"),
with rows 99px high. The board index table cuts every cell to one line with an ellipsis ("Documenten be..."), and the
existing opt-out `cellClass: "cn-cell--wrap"` set `white-space: normal` on the cell while the board rule kept the
cell renderer inside it on one line, so a wrapping column could not wrap in the board look.

A board index cell with `cn-cell--wrap` now lets its renderer wrap. Every other cell keeps its one line.

## Scope

- `src/css/look-board-index.css`: one rule for `td.cn-cell--wrap > .cn-cell-renderer`.
- No schema change; no change in the Nextcloud look.
