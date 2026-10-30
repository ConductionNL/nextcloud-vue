---
kind: code
---

# Proposal: week-strip-meta-through-relation

## Summary

DqMijnWerk draws each deadline in "Termijnen deze week" as the case number and the case type's short name:
"2026-4837 · Woo". The case holds only the case type's uuid and its identifier ("woo-verzoek"), so the strip
could show the number and nothing more.

## What changes

1. `source.extend`: relations OpenRegister inlines on each record (`_extend`), as the record list already
   takes. A meta field can then read a field of the related record, such as `caseType.title`.
2. A `metaFields` entry can be a list of fields. The item shows the first one that holds a plain value, so
   `["caseType.shortName", "caseType.title"]` reads the short name and falls back to the title.

A strip without `extend` and with plain string meta fields renders and fetches as before.
