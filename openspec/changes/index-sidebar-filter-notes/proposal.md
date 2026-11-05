---
kind: code
---

# Proposal: index-sidebar-filter-notes

## Summary

Board DqZaken draws in "Nog 18 filters" a line under the Team filter and a switch "Ook concepten van anderen tonen" with its own note. The index sidebar drew a filter's description only as an info popover and had no switch.

## Scope

- `src/utils/schema.js`, `src/components/CnIndexSidebar/CnIndexSidebar.vue`, `src/css/index-sidebar.css`, `tests/components/CnIndexSidebarFilterNotesAndSwitch.spec.js`.

## Out of scope

- The server side and the app's manifest; this is the library half.
