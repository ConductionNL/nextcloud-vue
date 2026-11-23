---
kind: code
---

# Proposal: board-bar-toggles-own-line

## Summary

r32 on DqFilterBeheren and DqFilterInMenu (side panel open): the boards draw
row 1 (chips, Save view, Filter at the end), the view switch on its own line
8px under it, and the search row 20px under that. Live put 20px between every
line (the list 12px low), and without Save view the switch fitted on row 1
and Filter sat beside the chips (the list 46px high).

Board look CSS: the bar's lines 8px apart with the search row's own 12px on
top; beside a side panel the switch starts its own line and Filter takes the
end of row 1. Probed on :8080: chips 233.6, switch 279.6, search 339.6, band
418.1 on both boards, as drawn.
