---
kind: code
---

# Proposal: facts-reveal-from-server

## Summary

Board DqContact: "Tonen" shows the BSN, and "Het tonen van het BSN wordt gelogd." With openregister
property-explicit-reveal (PR #4843) the person record carries only the mask, and the value comes from a read that
names it (`?_reveal=citizenServiceNumber`). OpenRegister checks that read and records it.

A masked facts entry may now declare `reveal: { url, path? }`:

- Show asks the server for the value at `url` (tokens resolved), uncached, read at `path` (else the entry's path);
- it shows that value and emits `reveal` as before;
- a failed read leaves the mask and says so.

`reveal: true` keeps unmasking the record's own value.

## Scope

- `src/components/CnFactsWidget/CnFactsWidget.vue`, l10n en/nl (1 key).
- No schema change: the facts `content` is not closed.
