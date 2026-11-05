---
kind: code
---

# Proposal: record-list-section-intro-heading

## Summary

Board DqDashboard draws two signal tiles with group headings ("Te laat" / "Risico", "Te laat" / "Komt eraan"). No row carries the field a `groupBy` would need, so the tiles use two `sections`, each with an `intro`; the intro drew as a plain line, and stayed over a section with nothing in it.

## Scope

- `src/components/CnRecordListWidget/CnRecordListWidget.vue`, docs, `tests/components/CnRecordListIntroHeading.spec.js`.

## Out of scope

- The app manifests that configure it; this is the library half.
