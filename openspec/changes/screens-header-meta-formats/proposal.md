---
kind: code
---

# Proposal: screens-header-meta-formats

## Summary

The meta line of a detail header (`headerMeta`) filled `{path}` tokens with raw values, so a date could only show as
an ISO string and "received yesterday" or "6 days open" could not be written. The line now uses the template filler
the record-list rows use, so the same date formats work in it.

## Scope

- `src/utils/headerMeta.js`: `resolveHeaderMeta` delegates to `fillTemplate`.
- No manifest schema change: `headerMeta` stays a string. A template without a format renders exactly as before.
- Not in this change: a count in the meta line. That needs a new manifest key and so a schema version.
