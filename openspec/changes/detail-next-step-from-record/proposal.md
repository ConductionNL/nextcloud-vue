---
kind: code
---

# Proposal: detail-next-step-from-record

## Summary

The "what now" card (`config.nextStep`) keeps its stage texts and checklists in the manifest, so every case type reads the same steps. Each case type should carry its own ("Wat nu? Stap 2: in behandeling", "Beoordeel de 3 documenten"). `nextStep.stagesFrom` names a field path, read like a `visibleWhen` field (`@context.caseType.nextStep`), whose stages map replaces the declared `stages` for that record.

## Scope

- `src/components/CnDetailPage/CnDetailPage.vue`: `effectiveNextStep`.
- Manifest: `nextStep.stagesFrom` is a new key; the batch integration adds it to the schema.
