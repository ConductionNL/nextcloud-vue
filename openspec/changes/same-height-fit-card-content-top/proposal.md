---
kind: code
---

# Proposal: same-height-fit-card-content-top

## Summary

A stretched `sameHeight` card keeps its content at the top (dashboard-row-same-height).
A stat tile in such a row is also a fitted card, and the dashboard page centres
a fitted card's content with a selector of the same strength that loads later,
so the centring won: DqProcesanalyse's tiles without a caption drew their label
10.5px lower than the board (r45 insetTop 29.5 vs 19). The grid's rule now
carries the grid item class as well. Cards as tall as their row do not move.
