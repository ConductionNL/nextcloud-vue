---
kind: code
---

# Proposal: transition-checkbox-note

## Summary

Board DqVolgendeStap draws a note under the switch "Herinner de verzoeker als het antwoord uitblijft". CnTransitionInputFields drew `input.note` under text fields only.

## Scope

- `src/components/CnTransitionInputFields/CnTransitionInputFields.vue`, `tests/components/CnTransitionInputFieldsCheckboxNote.spec.js`.

## Out of scope

- The server side and the app's manifest; this is the library half.
