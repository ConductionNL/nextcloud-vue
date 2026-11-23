---
kind: code
---

# Proposal: board-person-chip-row-height

## Summary

Board DqContacten draws each row 66px tall: 14px of padding above and below, then a 36px grey chip beside the name
(15/600) and the address (14px), 2px apart. Live drew 63px: the two-line avatar cell keeps PtAccounts' 12px padding and a
13px/16px second line with no gap (r29 rowHeight 63 vs 66).

## Scope

- `src/css/look-board-index.css`: in the board look, a grey chip (`tone: "neutral"`) with a second line gets 14px of
  padding, a 2px gap and a 14px second line at the normal line height. The headless probe on :8080 with the rules
  injected reads every row at 66px.
