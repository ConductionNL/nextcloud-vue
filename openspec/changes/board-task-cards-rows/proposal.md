---
kind: code
---

# Proposal: board-task-cards-rows

## Summary

Board DqTaak draws the Afspraken and Notities rows the same way:

- a hairline above every row, the first one included, and 12px 0 padding;
- a 32px round tile in the light primary ground, 12px before the text: the day an appointment starts, or the author's initials on a note;
- the title in 15/600 (the appointment's summary, the note's text);
- one 13px muted meta line, joined with " · " ("21 okt, 14:00 tot 15:00 · zaal 2.04", "Pieter Jansen · 6 okt 11:10").

The r26a triage found live draws a column of muted lines with the rule under each row and no tile.

## Scope

- `src/components/CnEventsCard/CnEventsCard.vue`: a day tile and a text wrapper per row. The tile is hidden outside the board look.
- `src/components/CnNotesCard/CnNotesCard.vue`: an initials tile per note, read with `utils/initials.js`. It is hidden outside the board look.
- `src/css/look-board-detail.css`: the board row look.
