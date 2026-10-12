---
kind: code
---

# Proposal: files-browser-hosts-a-documents-list

## Summary

`CnFilesBrowser` (and `CnFilesTab`, which renders it for a manifest `files`
widget) grows the seams a host needs to run its documents list on the files
browser instead of on a component of its own: the host's columns and row data
reachable from a manifest, row actions that apply to some files only, a
selection with bulk actions, and grouping and a filter on a declared column.
Every seam is off unless the host asks for it.

## Why

dossiq's case page lists the case's documents in a Files tab on
`CnFilesBrowser`, and declares more than the browser does (Ruben, decision
153: the library component grows to cover what the app's Documents tab added,
abstractly, so the app drops its own pieces and other apps can use the same):

1. `columns` (sender, recipients) is declared on the widget and dropped:
   `CnFilesTab` never forwarded it, and `rowData` is a function, which a JSON
   manifest cannot hold.
2. "Read as a message" is offered on every file, because a row action has no
   condition, so it has to answer "this is not a mail" on a PDF.
3. Mark as final and Change confidentiality are offered per row only, because
   the browser has no selection; the documents list they came from had one.
4. The list it replaced grouped documents by type and filtered on keywords in
   use; `CnObjectListWidget` learned both (`object-list-widget-grouping-select-facet`)
   but the files browser, where the documents now live, did not.

## What changes

- `CnFilesTab` forwards `columns`, `preferenceApp` and `preferenceKey`, and
  takes `rowDataUrl` (with `rowDataPath`, `rowDataKey`), which it turns into
  the browser's `rowData`: one read per listing, keyed by file id.
- A row action may carry `visibleIf` (`extension`, `mime`); it is offered only
  on files it names.
- `bulkActions`: a checkbox per file, select all, and a bar with the host's
  bulk actions, dispatched with every selected file.
- `groupBy`: files under a heading per value of a declared column, with a
  count. `facets`: per declared column, a chip per value in use with its
  count, which narrows the list.
- `CnFilesTab` forwards `bulkActions`, `groupBy` and `facets`.

## Backward compatibility

All additive. Without `rowDataUrl` the tab passes no `rowData`; without
`visibleIf` a row action shows on every file; without `bulkActions` there is
no checkbox column; without `groupBy` or `facets` the table renders as today.
No prop changes meaning, no default changes. Minor version.

## Affected

- `src/components/CnFilesBrowser/CnFilesBrowser.vue`, `filesBrowser.js`
- `src/components/CnObjectSidebar/CnFilesTab.vue`
- docs: `docs/components/cn-files-browser.md`, generated partials
- consumer: dossiq `documents-on-the-case` task 2.2 (case Files tab)
