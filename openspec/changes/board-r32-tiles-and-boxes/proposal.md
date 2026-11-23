---
kind: code
---

# Proposal: board-r32-tiles-and-boxes

## Summary

Two r32 strict verdict items:

- **DqTaak checklist.** The boxes still "visually differ" (57-72%). The board draws a native checkbox: an 18px square with a
  2px corner, a grey 1px edge while open, and filled blue with a white tick once checked. NcCheckboxRadioSwitch draws a
  Material icon glyph, which reads as a smaller box with a different tick. The board look now hides the glyph, keeping its
  size, and draws the box. Probed with the rules injected: 18 × 18 at x 315, rgb(54,105,165) when checked, a white field
  with an rgb(130,138,149) edge when open, and a screenshot that reads as the board.
- **DqOrganisatie "Hoofdcontact".** The initials ("MV") are 16px in the boards' soft ink (#3d4047). Live drew them 15px in
  the main ink.

## Scope

`src/css/look-board-detail.css`. The r31 checklist rules (svg 18px, grey icon colour) are replaced.
