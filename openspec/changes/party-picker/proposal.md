---
kind: code
---

# Proposal: party-picker

## Summary

ARCH-AUDIT P1-15. dossiq's InitiatorPicker (669 lines) searches BRP persons, KvK companies and Nextcloud contacts for a case's requester; pipelinq and shillinq need the same for clients. CnPartyPicker is that picker: one search field over configurable sources (OpenRegister register sets and the reader's Nextcloud contacts), rows with the kind and a second line, built on CnSearchSelect.

## Scope

- New `src/components/CnPartyPicker/`, exported.
- No schema change: it is used from app code or as a registry form field.
