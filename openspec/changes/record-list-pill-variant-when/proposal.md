---
kind: code
---

# Proposal: record-list-pill-variant-when

## Summary

r31 strict verdicts on DqContact and DqOrganisatie:

- **The "Zaken" pill.** The boards draw a finished case's pill ("Afgehandeld") in green; live drew every case pill in the
  list's purple. A status name is data per case type, so a `colorMap` by name does not carry across case types. A pill now
  takes `variantWhen`: `[{ when, variant }]`, where the first condition that holds for the row wins over `colorMap`. The
  app colours a pill green when `isFinalStatus` holds.
- **The side-row gap.** In a side card, the pill and its date stand 8px apart on the boards (DqOrganisatie "Lopende
  zaken", gapNext 8 vs 16). The side rows' aside gap is 8px in the board look. The probe on :8080 with the rule injected
  reads 16 → 8.

## Scope

`src/components/CnRecordListWidget/CnRecordListWidget.vue`, `src/css/look-board-detail.css`.
