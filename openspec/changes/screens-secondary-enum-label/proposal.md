---
kind: code
---

# Proposal: screens-secondary-enum-label

## Summary

On board DcVergaderingen the Orgaan and Locatie columns carry a muted second line, "Gewone vergadering" and "Op
locatie". CnDataTable's `secondary` filled it with the stored value, so an enum field read "regular" and "in-person".
An enum cell already shows its label (`x-enum-labels`, translated); the secondary line now does the same.

## Scope

- `src/components/CnDataTable/CnDataTable.vue`: `secondaryFieldText`, used for a bare key and for each field of a
  template.
- No manifest key, no schema change. A field that is not an enum reads as before.
