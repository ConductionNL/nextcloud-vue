---
kind: code
---

# Proposal: object-table-pager

## Summary

Board DqCatalogus draws its object types table with a pager under it: "4 van 7" and the page buttons with Volgende. An object-table widget could only cap its rows (`limit`) with a "View all" link. `pageSize` pages the rows instead, with CnPagination's existing board variant.

## Scope

- `src/components/CnDataTable/CnDataTable.vue`: `pageSize`, the page window and the pager.
- `src/components/CnWidgetObjectTable/CnWidgetObjectTable.vue`: `pageSize`, forwarded; under a pager `source.limit` is how many rows are read rather than a "View all" cap.
- Manifest: `pageSize` is an object-table prop (the v2 widget props); the batch integration documents it in the schema.
