---
kind: code
---

# Proposal: files-browser-side-cards

## Summary

The board DqDocumentenBeheer draws a case's documents with more around the selection than `CnFilesBrowser` offered:

- the bulk bar reads "2 documenten geselecteerd" (the browser said "2 geselecteerd") and has no Clear selection button;
- beside the list, cards about a file: "Wie mag dit zien: Offerte verlichting.pdf" (default, exception, reason, and "Uitzondering wijzigen") and "Controlegetal";
- a Scan column as pills (clean green, "virus gevonden" red), and the restricted visibility text in the warning colour.

`CnFilesBrowser` (and `CnFilesTab`, which forwards it) gains:

- `selectionLabel` / `selectionLabelOne`: the count as the app words it, with `{count}`; `showClearSelection` to leave the button out;
- `sideCards`: cards about the last selected file, beside the list, with fields from the row data or the node and actions that run on that file; no column while nothing is selected;
- per column (and card field) `colorMap` and `colorKey`: a value-to-tone map, read from the value or another row field. With `widget: "badge"` the cell is a pill in that tone (the tables' convention); otherwise the text takes the tone's colour.

Nothing here is specific to an app. Without the new props the browser renders as before.

## Scope

- `src/components/CnFilesBrowser/CnFilesBrowser.vue`, `src/components/CnObjectSidebar/CnFilesTab.vue`, `docs/components/cn-files-browser.md`, `l10n/en.json`, `l10n/nl.json`.
- No schema change: the files widget's props are not schema-declared.
