---
kind: code
---

# Proposal: board-record-list-checklist-rows

## Summary

Under the board look a record list with `presentation: "checklist"` draws its
rows as DqTenant "Inrichten" does: 20px rows 8px apart, the 20px mark 10px
before a 15px label, a done mark on the board's soft green with a 12px tick,
and the progress bar 12px above the rows. The component's own rows are 28px
tall, which made the card 23px taller than drawn (r44: 198.3 vs 175) and moved
every card under it. Outside the board look nothing changes.
