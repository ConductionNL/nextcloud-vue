---
kind: code
---

# Proposal: avatar-cell-user-display-name

## Summary

On board DqTaken the Behandelaar column shows "PJ  Pieter Jansen". The tasks list declares that column as
`{ key: "assignee", widget: "avatar", widgetProps: { user: true } }`: the cell holds a Nextcloud user id. The avatar
picture already comes from that id, but the name beside it was the id itself ("pieter"), because a task row carries no
display name.

An `avatar` cell that holds a user id now shows the user's display name, looked up once per id through the shared
`userDisplayName` cache that the facts widget and the header meta already use. A `nameField` name still wins; while
the name is looked up, and for an id that resolves to nothing, the cell shows the id as before.

## Scope

- `src/components/CnCellRenderer/CnCellRenderer.vue`: `avatarName` reads `userDisplayName(avatarUserId)` for
  `widgetProps.user`.
- No schema change.
