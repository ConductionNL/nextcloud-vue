---
kind: code
---

# Proposal: facts-row-inline

## Summary

Board DqContact draws the side card "Identiteit" with the BSN on its own line across the card: the label, the masked
number and the "Tonen" button, 10px apart. Below it come the label-and-value rows ("Geheimhouding", "Bron"). On live, the
BSN sat in the two-column grid: a 101px label column ("Geheimhouding") left 138px for the value, and the number plus the
78px button did not fit, so "Tonen" wrapped under the number (r29: structure differs, and the card is 61px taller).

## What changes

A facts row may set `inline: true`. It then spans both columns as one flex line, with the label, the value and the value's
buttons 10px apart, wrapping only when the card is too narrow. Other rows stay in the grid.

## Scope

- `src/components/CnFactsWidget/CnFactsWidget.vue` (template, docs, scoped CSS). The app sets `inline: true` on the
  BSN row.
