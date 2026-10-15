---
kind: code
---

# Proposal: board-stat-tile-grows

## Summary

In a dashboard card-fit cell, a stacked board stat tile is exactly as tall as the cell's content box and clips what does not fit. dossiq's "Afgehandeld deze maand" at 1100 wide wraps its label to two lines and holds 129px of content in a 114px tile, so the last line is cut.

Under the board look a stacked tile now takes at least the cell's height (`min-height: 100%`) and otherwise the height of its content (`height: auto`, no shrinking). A tile that fits keeps its size. A tile that does not grows into the cell's padding, and the card-fit cell's `safe center` keeps its top in view, so the label, the number and the caption all show.

## Scope

- `src/css/kpi-card.css`: `.cn-kpi-card--board.cn-kpi-card--stacked`. The selector also matches `CnStatsBlock` with `layout: stacked` under the board look, which emits the same two classes. Other tiles are unchanged.
- No component or schema change.
