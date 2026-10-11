---
kind: code
---

# Proposal: aggregate-zero-label

## Summary

A table column with an `aggregate` block counts a related list for every
visible row. When a row has none, the cell reads "0". The drawn boards write
"Geen" in that place, so a manifest needs a way to name a zero count.

## What changes

1. A column's `aggregate` block takes an optional `zeroLabel`. A count of
   zero renders as that label, translated through the injected `cnTranslate`
   (the app's catalogue and the manifest's `i18n` labels).
2. Without `zeroLabel` nothing changes: a zero count reads "0", a pending
   count "…" and a failed one "—".

Column objects in the manifest schema already allow any key
(`additionalProperties: true`), so the schema does not change and needs no
version.
