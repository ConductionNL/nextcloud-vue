---
kind: code
---

# Proposal: board-avatar-chip

## Summary

The boards draw a person in a table as an initials chip:

- DqTaken: a 28px chip in light primary;
- DqContacten: a 36px chip in grey.

Live drew the Nextcloud avatar picture: thin generated initials, or a photo. The coordinator decided on 24 Oct:

- in the board look, the avatar cell draws the initials chip, with size and tone as configuration;
- photos stay in the Nextcloud look.

The changes:

- In the board look, an avatar cell holding a user draws the initials chip instead of NcAvatar.
- `widgetProps.size` sets the chip's size (as before).
- `widgetProps.tone: "neutral"` draws it grey, with 13px initials and 12px before the name.

## Scope

- `src/components/CnCellRenderer/CnCellRenderer.vue`, `src/css/look-board-index.css`.
- No schema change.
