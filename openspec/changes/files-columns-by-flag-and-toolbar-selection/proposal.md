---
kind: code
---

# Proposal: files-columns-by-flag-and-toolbar-selection

## Summary

Board DqZaakDocumenten shows Type, Richting and Auteur by default on a case type that reviews documents, without moving DqDocumentenBeheer, and draws "Samenvoegen tot één PDF" as a toolbar button that runs on the ticked files and is off, with its reason, while none is ticked. A files column could be hidden by default but not hidden unless a flag held, and bulk actions drew only in the bar under the toolbar once files were ticked.

## Scope

- `src/components/CnFilesBrowser/filesBrowserColumns.js`, `src/components/CnFilesBrowser/CnFilesBrowser.vue`, `src/components/CnObjectSidebar/CnFilesTab.vue` (forwarding), l10n en + nl (1 string), docs, `tests/components/CnFilesBrowserToolbarSelection.spec.js`.

## Out of scope

- The app manifests that configure it; this is the library half.
