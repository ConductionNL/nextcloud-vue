---
kind: code
---

# Proposal: board-head-label-beside-funnel

## Summary

Board DqOrganisaties wraps "Lopende / zaken" and "Laatste / contact" by word, with the funnel beside the last line, and
the head row is 58.5px. On live, these columns are unsortable, so the label is a plain span. It stayed on one line and the
22px funnel dropped onto a line of its own, which made the head row 64px (r29 headRowHeight 63.5 vs 58.5). A sortable label
already keeps room for the funnel.

## Scope

- `src/css/look-board-index.css`: in the board look, a plain head label followed by a filter funnel is an inline block
  26px narrower than the cell, centred beside the funnel. The headless probe on :8080 with the rule injected reads every
  head cell at 59px.
