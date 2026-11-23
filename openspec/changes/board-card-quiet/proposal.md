---
kind: code
---

# Proposal: board-card-quiet

## Summary

On dossiq's Werkbord under the library board, the card titles render as blue underlined links and every card carries a checkbox. The board (DqWerkbord) draws dark, plain titles and no checkbox. The titles lose because thematiq gives every `<a>` its link colour and underline with `!important`, which outranks the board's class rule.

Under the board look the card title now keeps the main text colour and no underline with `!important` (underline on hover, as before). The selection checkbox is collapsed (no width, transparent, still in the tab order) until the card is hovered or holds focus, or anything is selected, in which case every card shows it. On a device without hover it always shows.

## Scope

- `src/css/board.css`: the card title, the idle checkbox.
- `src/components/CnBoardView/CnBoardView.vue`: a `cn-board-view--selecting` class while the selection is not empty.
- The Nextcloud look is unchanged. No schema change.
