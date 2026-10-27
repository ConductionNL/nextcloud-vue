---
kind: code
---

# Proposal: board-r31-chip-ink-notes-date

## Summary

Two r31 findings:

- DqContacten: the grey person chip's initials are drawn in the soft ink #3d4047 on the normal line height (15.6). Live drew
  them in the main ink on a 13px line (cell.color, cell.lineHeight). They now take `--cn-board-text-soft` and
  `line-height: normal`.
- DqTaak Notities: the boards write a note's moment as "6 okt 11:10", without this year. Live wrote "26 okt 2026, 12:15",
  read as a second date in the row (structure). In the board look, CnNotesCard now formats with the library's board
  formatter (`formatBoardDateTime`). The Nextcloud look keeps its full date.

## Scope

`src/css/look-board-index.css`, `src/components/CnNotesCard/CnNotesCard.vue` (it injects `cnLook`).
