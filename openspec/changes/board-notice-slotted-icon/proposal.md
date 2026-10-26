---
kind: code
---

# Proposal: board-notice-slotted-icon

## Summary

Board DqSociaalDomein draws the side notice "Bijzondere persoonsgegevens" with an 18px icon, 2px down, and the text 10px
after it, starting 44px into the notice. On live, NcNoteCard rendered the banner's slotted icon as a bare 22px material
icon without the `notecard__icon` wrapper that the board-look rules target, so the text started at 48 (r29 titleInsetLeft
48 vs 44).

## Scope

- `src/css/look-board-detail.css`: the side-notice icon rules also take a direct `.material-design-icon` child. The
  headless probe on :8080 with the rules injected reads the icon at 16 (18px wide) and the text at 44.
