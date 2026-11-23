---
kind: code
---

# Proposal: data-widget-tag-pills

## Summary

Board DqZaak draws the case's labels in Zaakgegevens as pills with a remove button each, then "+ Label", and "Vrije woorden. In Alle zaken filtert u op een label." under them. The data widget read a tags field as text and edited it only by opening the select.

## Scope

- `src/components/CnObjectDataWidget/CnObjectDataWidget.vue`, l10n en + nl (2 strings), docs, `tests/components/CnObjectDataWidgetTagPills.spec.js`.

## Out of scope

- The app manifests that configure it; this is the library half.
