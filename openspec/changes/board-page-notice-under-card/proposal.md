---
kind: code
---

# Proposal: board-page-notice-under-card

## Summary

r32 DqContracten: the boards draw a page notice 20px under the list card.
Live the index body kept the column's height while the card kept its rows'
height, so the card ran past the body and the notice sat 8px under it (and
over the card in a short window), with the notecard's 15px top margin on
top. In the board look the body keeps the card's height when a page notice
follows, and the notice drops its own top margin. Probed on :8080: notice
20px under the card (board 1825, live 1823.8).
