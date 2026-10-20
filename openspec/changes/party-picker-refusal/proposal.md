---
kind: code
---

# Proposal: party-picker-refusal

## Summary

OpenRegister refuses a search term it cannot parse (an unclosed bracket or quote) with a 400 rather than running it, so that "no match" is never a misread. CnPartyPicker swallowed every source failure into an empty list, so a refused term looked like nobody being found, and the reader searched for someone else. dossiq's InitiatorPicker said the refusal; moving dossiq onto CnPartyPicker needs the library to say it too.

## Scope

- `src/components/CnPartyPicker/CnPartyPicker.vue`, docs, l10n (one string), spec.
- No schema change.
