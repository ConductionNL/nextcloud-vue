---
kind: code
---

# Proposal: related-groups-by-relation

## Summary

Board DqZaakGerelateerd lists a case's related cases under one heading per relation type ("Onderwerp van deze zaak", "Wacht op"), then the planned follow-ups with a "Vervolg plannen" action on their heading. CnRelatedObjectsWidget merged every uses/used row into one Objects tab, though OpenRegister answers each row with its relation (`relation.displayLabel`, per direction). `groupByRelation` splits Objects by that label, `layout: "sections"` draws every group under a heading in one list, and `groupActions` (or an extra section's `action`) puts an action on a heading.

## Scope

- `src/components/CnRelatedObjectsWidget/CnRelatedObjectsWidget.vue`.
- Manifest: `groupByRelation`, `groupActions` and the `sections` layout are new `related` content keys; the batch integration adds them to the schema.
