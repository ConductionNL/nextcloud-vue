---
kind: code
---

# Proposal: register-mapping-late-configuration

## Summary

r31 DqBeheerinstellingen "Configuratie": every schema select read "Selecteer een schema" under "Geen schema's beschikbaar in dit register", although register 23 answers 186 schemas. dossiq reads its settings after CnRegisterMapping mounts: at mount no register is mapped, and when the configuration arrives the registers are still loading, so the watcher skips the schema read and nothing reads it later. Once the registers have loaded, the mapped registers' schemas are now read.

## Scope

- `CnRegisterMapping.vue` loadRegisters, a jest test (fails before).
