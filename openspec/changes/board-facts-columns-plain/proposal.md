---
kind: code
---

# Proposal: board-facts-columns-plain

## Summary

Board DqContact draws the "Contact" card as plain label-over-value pairs (DqOrganisatie and PqOrganisatie use the same
`<dl>`):

- the 13px muted label 2px above the value;
- the value in regular weight;
- no hairline under a fact; the grid's 14px row gap separates the facts.

In r29, live drew every fact with a hairline, 10px under the value, and the value in weight 500 (structure "title / meta /
meta deadline / meta").

## Scope

- `src/css/look-board-detail.css`: in the board look, two-column facts drop the hairline and padding, set the label 2px
  above the value, and use regular weight and the normal line height.
