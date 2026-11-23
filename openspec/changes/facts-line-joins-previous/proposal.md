---
kind: code
---

# Proposal: facts-line-joins-previous

## Summary

Board DqContact "Bereikbaar via" writes the last contact and the registration note as one muted paragraph, 14px on a
1.45 line: "Laatst contact op 4 oktober, 10:52, via Mijn Zuiddrecht. Telefoon en e-mail staan niet in de
basisregistratie." Live drew the last contact as body text and the note as a separate line, so r32 read an extra
structure element. The two come from different records: the contact moment, and the person. The note must still show when
the person has no contact moment, or users would lose it.

## What changes

- A facts `line` or `text` entry may set `joinPrevious: true` (with `joinSeparator`, a space by default). It is then written
  on after the line or text just before it, as one paragraph marked `--joined`. With nothing before it, it stands alone.
- In the board look, a joined paragraph in a side card is 14px on a 1.45 line, and a value beside an icon (the
  berichtenbox row) reads in the regular weight.

## Scope

`src/components/CnFactsWidget/CnFactsWidget.vue`, `src/css/look-board-detail.css`. dossiq sets `joinPrevious` on the
note.
