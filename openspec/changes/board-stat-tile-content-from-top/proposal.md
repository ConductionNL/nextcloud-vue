---
kind: code
---

# Proposal: board-stat-tile-content-from-top

## Summary

Under the board look a stacked stat tile on a dashboard holds its label,
number and caption at its top inset. In a `sameHeight` row a tile without a
caption is stretched to the tallest tile, and the stacked tile's
`justify-content: center` then centred its content, 10px lower than the
boards draw it (DqProcesanalyse r44: insetTop 29.5 vs 19). Tiles as tall as
their row do not move. Outside the board look nothing changes.
