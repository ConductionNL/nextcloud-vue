---
kind: code
---

# Proposal: board-register-mapping-selects

## Summary

DqBeheerinstellingen "Configuratie" (CnRegisterMapping `boardLayout: "selects"`, board look only) draws the register select across half the card and the schema selects without a clear "×". Live drew a 255px register select (the select kept its own width inside the half-width cell) and a clear button on every schema select. The select now fills its cell, and the schema selects pass `clearable: false`. The Nextcloud look is unchanged.

## Scope

- `src/components/CnRegisterMapping/CnRegisterMapping.vue`, `tests/components/CnRegisterMappingSelectGrid.spec.js`. No schema change.
