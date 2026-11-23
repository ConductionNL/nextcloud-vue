---
kind: code
---

# Proposal: screens-avatar-row-height

## Summary

Board PtAccounts draws an account row 59px high: a 32px initials circle beside the name and the e-mail. In an app the
same row was 82px, because the two lines took the host's line height (Nextcloud sets 1.5 on the body) and the cell
kept the table's 14px padding. The two-line avatar cell now sets its own line heights and padding under the board look.

## Scope

- `src/css/look-board-index.css` only, under `.cn-look-board` and only for a cell that holds an avatar with a second
  line. Without the board look, and for every other cell, nothing changes.
- No manifest schema change.
