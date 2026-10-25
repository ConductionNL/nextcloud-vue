---
kind: code
---

# Proposal: board-ruled-list-card-start

## Summary

Board DqContact and DqOrganisatie draw the "Zaken" and "Tickets" cards like this:

- the title, then the first row's rule 12px under it (a 4px card gap plus the header's 8px margin);
- each row padded 12px above and below.

The first row's text therefore sits 25px under the title. In r29, live drew the rule 9.75px under the title (the
card's 12px glyph-to-glyph start) with rows padded 10px, so the first row's text sat 20.7px under the title.

## Scope

- `src/css/look-board-detail.css`: in the board look, a page card whose content opens on a ruled rows list (`ruleAbove`)
  starts 12px down, and its rows have 12px padding. Side cards and the dashboard keep their own rules.
