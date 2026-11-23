---
kind: code
---

# Proposal: avatar-cell-group-fallback

## Summary

Board DqTaken's Behandelaar column shows a pooled task, one nobody has claimed, as "TW  Team Woo, niet geclaimd":
the team it waits on, in words. The avatar cell showed a dash, because the task has no assignee; the team is in the
row's `candidateGroups`.

An `avatar` cell may name a group when it holds nobody: `widgetProps.groupField` names the row field with group ids
(a list or one id), `groupLabel` the words around it ("{group}, unclaimed"). The cell then shows the first group's
display name (looked up once, through the existing group name cache) with its initials. A cell that holds a person is
unchanged.

## Scope

- `src/components/CnCellRenderer/CnCellRenderer.vue`: `avatarGroupId`, `avatarGroupName`, a watcher that loads the name.
- Stacked on fix/avatar-cell-user-display-name (same computed).
- No schema change.
