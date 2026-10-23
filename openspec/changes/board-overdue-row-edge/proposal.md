---
kind: code
---

# Proposal: board-overdue-row-edge

## Summary

Board DqTaken marks the tasks past or at their deadline with a 4px red edge on the row's leading side. CnIndexPage
already documents `config.rowClass` with `class: "cn-row--overdue"` for this, but no stylesheet drew the class.

In the board look a row with `cn-row--overdue` now has a 4px edge in the error colour on its first cell. The Nextcloud
look is unchanged.

## Scope

- `src/css/look-board-index.css`: one rule.
- No schema change.
