---
kind: code
---

# Proposal: settings-number-decimal-step

## Summary

A number setting without `integer` holds decimals (dossiq KCC "Identificatiescoredrempel (0,6 - 1,0)", 0.8). The input had no step, so the browser stepped by 1, held 0.8 invalid and drew the field red (r29, DqBeheerGeavanceerd). CnSettingsField's number input now takes the field's `step`, else 1 for an `integer` field, else `any`.

## Scope

- `src/components/CnSettingsField/CnSettingsField.vue`, a test. No schema change.
