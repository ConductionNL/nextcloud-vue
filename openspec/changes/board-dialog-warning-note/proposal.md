---
kind: code
screens: [PqGesprekNieuwContact, DqNieuweZaakDubbel]
---

# Proposal: board-dialog-warning-note

## Summary

Board PqGesprekNieuwContact opens the intake dialog with a warning line, "Geen contact gevonden bij 06 ...", on the
status warning ground (#fff4de) in the warning ink at radius 8. Live drew NcNoteCard's own look: a blended orange ground,
radius 4, main ink. DqNieuweZaakDubbel draws its warning with a 4px ink edge; where the Pq and Dq boards differ the Dq
board wins, so the edge stays.

## What changes

- dialog.css: in a board dialog a warning note takes the status warning ground and ink, radius 8, 10px 14px padding, a
  10px gap, the 4px edge in the ink, and its text at 14px on a 1.45 line. The duplicate warning keeps its own, bolder
  rule.
