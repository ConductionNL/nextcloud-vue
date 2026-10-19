---
kind: code
---

# Proposal: files-drop-panel

## Summary

Board DqZaakDocumentenSlepen draws the case's Bestanden tab while files are dragged onto it: a dashed overlay over the whole panel, an upload icon, "Laat los om toe te voegen", and a line saying where the files go ("3 bestanden komen bij zaak 2026-0082, als nog te beoordelen document."). CnFilesBrowser's overlay covered only the list's own height with one fixed line, and the files leaf could not set it. `dropDetail` adds the line (with the dragged file count) and makes the overlay fill the panel; `dropLabel` and `dropDetail` go through the host translate and the files tab forwards both.

## Scope

- `src/components/CnFilesBrowser/CnFilesBrowser.vue`: `dropDetail`, the dragged count, the panel fill.
- `src/components/CnObjectSidebar/CnFilesTab.vue`: forwards `dropLabel` and `dropDetail`.
- Manifest: `dropLabel` and `dropDetail` on the files leaf's props; the batch integration documents them in the schema.
