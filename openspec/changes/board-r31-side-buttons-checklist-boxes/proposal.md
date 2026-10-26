---
kind: code
---

# Proposal: board-r31-side-buttons-checklist-boxes

## Summary

Three r31 strict verdict items, each sized with one headless probe on :8080:

- **DqSociaalDomein "Toestemming intrekken".** The board draws it the full width of the card (254px), 34px high, with its
  label at the start. Live drew it 188 × 40px. A side facts action now stretches at the 34px control height. Probed:
  254 × 34, label 15px in.
- **DqSociaalDomein "Markeer voor aandacht".** It already spans the card, but live centred its label; the board puts it at
  the start. The attention flag's buttons now start their label. Probed: label 39px in (padding 14, icon 16, gap 8).
- **DqTaak checklist boxes.** The board's open boxes are 18px and grey; live drew 20px boxes in the primary colour. The
  boxes are now 18px, grey (`--color-border-maxcontrast`) while open, and primary once ticked. Probed: 18px, rgb(130, 138, 149).

## Scope

`src/css/look-board-detail.css`.
