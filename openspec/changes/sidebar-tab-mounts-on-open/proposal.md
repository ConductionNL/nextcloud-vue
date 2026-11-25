---
kind: code
---

# Proposal: sidebar-tab-mounts-on-open

## Summary

NcAppSidebarTab renders its content whether or not it is the open tab, so every tab of an object sidebar mounted, and read its data, as soon as the page opened. Measured on the dossiq case page (24 Nov 2026): audit trail, shares, access links, permissions and grants were read before anything was clicked. A tab's content now mounts when the tab is first opened and stays mounted after.

## Scope

- `src/components/CnObjectSidebar/CnObjectSidebar.vue` (all three tab branches: custom `tabs`, registry providers, built-in tabs), `tests/components/CnObjectSidebarTabsMountOnOpen.spec.js`, `tests/components/CnObjectSidebar.spec.js`.

## Out of scope

- Mount-mode leaves (`renderMode: 'mount'`): CnLeafMountHost already mounts them when their tab is active.
