---
kind: code
---

# Proposal: page-filter-options-from

## Summary

ARCH-AUDIT P1-16. dossiq hand-builds the case-type filter of three reporting dashboards (DtCaseTypeFilter, PmCaseTypeFilter, TdCaseTypeFilter): an NcSelect over case types read from a store, writing the workspace's `caseType`, clearable to "All case types". A page filter could only list its options in the manifest. `optionsFrom` reads them from OpenRegister objects or an app endpoint, and `clearable` with `placeholder` lets the reader clear it back to all.

## Scope

- `src/components/CnDashboardPage/CnDashboardPage.vue`: `optionsFrom`, `clearable`, `placeholder` on a page filter.
- Manifest schema: `optionsFrom`, `clearable` and `placeholder` are new `pageFilters[]` keys, and `options` is no longer required when `optionsFrom` is given (both schemas close the item with `additionalProperties: false`); the batch integration bumps.
