---
kind: feature
---

# CnIndexPage export action — CSV/Excel for all OR schema indexes

## Why

Every app using OpenRegister index pages (CnIndexPage, CnDataTable) should offer CSV/Excel export of the displayed schema objects — it's table-stakes for list UIs (management reporting, data portability, evidence gathering). Currently, export is either:
- **Not present** (most apps)
- **Duplicated per-app** (procest, pipelinq, others) with inconsistent UX
- **Domain-specific** (financial reports, legal exports) which is correct

The solution: add a native export action to `CnIndexPage` that leverages OpenRegister's export leaf. Every app using OR gets export automatically when the schema is flagged `exportable: true`.

## What changes

- **New `CnIndexPage` prop:** `allowExport: boolean` (default false, opt-in per page)
- **New export toolbar action:** When `allowExport` is true and the schema is `exportable: true`, render an Export menu (CSV/Excel) in the index toolbar
- **URL building:** Export button navigates to `GET /apps/openregister/api/objects/{register}/{schema}/export?format=csv|excel` with current route filters passed through
- **No procest-side serialization:** OR handles CSV/Excel generation, access control, and filtering

## Impact

- **Cross-fleet benefit:** Any app using OR indexes gets export for free (no per-app reimplementation)
- **Consistent UX:** All OR indexes have identical export menu, behavior, and appearance
- **Zero procest changes needed:** procest just sets `allowExport: true` on the Cases page; the export action is already in nc-vue

## Capabilities

### New Capabilities
- `cnindexpage-export-action` — all OpenRegister schema index pages offer CSV/Excel export via the OR export leaf when enabled
