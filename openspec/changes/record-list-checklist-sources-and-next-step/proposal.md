---
kind: code
---

# Proposal: record-list-checklist-sources-and-next-step

## Summary

Board DqZaakDocumenten draws the Volledigheid card as a checklist whose rows say where each requirement comes from at the row end (or "ontbreekt"), a header pill with the verdict of the answer ("Nog niet ontvankelijk") and two buttons side by side under it. Board DqTenant draws Inrichten with a muted line under each step's title and the next step spanning the row with a "Volgende stap" pill and its action. The record list's checklist drew a tick and a title only, and its footer took one action.

## Scope

- `src/components/CnRecordListWidget/CnRecordListWidget.vue`, docs, `tests/components/CnRecordListChecklistSourcesNext.spec.js`.

## Out of scope

- The app manifests that configure it; this is the library half.
