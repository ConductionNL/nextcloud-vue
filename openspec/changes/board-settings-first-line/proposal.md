---
kind: code
---

# Proposal: board-settings-first-line

## Summary

r31: a board settings card's first line sat lower than the boards draw it. The "Uitleg tonen" link (a 40px button), a switch (34px) and a status note (NcNoteCard's 16px margins) each added height around their text; the longer explanation read 15px with a 16px margin. In the board look the link and switch take -8px block margins (hit areas unchanged), a status note in a fields grid has no margin, and the explanation reads 14px muted at 1.5 with no margin.

## Scope

- `src/css/look-board.css`, a css test.
