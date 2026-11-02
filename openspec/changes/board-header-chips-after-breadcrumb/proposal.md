---
kind: code
---

# Proposal: board-header-chips-after-breadcrumb

## Summary

Under the board look a detail page draws its header field chips on the second
header row, after the breadcrumb and before the middle dot and the meta line,
as the DqTenant board draws the slug pill ("Gemeente Waterland  waterland
· een van ... organisaties"). The chips list drops its 6px top margin on that
row, which made the header 6px taller than drawn (r44: 85 vs 79). Outside the
board look nothing changes.
