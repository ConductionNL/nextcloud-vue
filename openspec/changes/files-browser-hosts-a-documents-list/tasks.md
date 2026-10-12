# Tasks: files-browser-hosts-a-documents-list

- [x] 1.1 `filesBrowser.js` `indexRowData(data, { path, key })`: a host answer to records by file id (list, list at a path, under `items`/`results`, or already keyed).
  - `tests/components/CnFilesBrowserHostRows.spec.js` (indexRowData)
- [x] 1.2 `CnFilesTab` forwards `columns`, `preferenceApp`, `preferenceKey`; `rowDataUrl`/`rowDataPath`/`rowDataKey` become the browser's `rowData`, read once per listing.
  - `tests/components/CnFilesBrowserHostRows.spec.js` (CnFilesTab forwards a documents list)
- [x] 1.3 Row action `visibleIf` (`extension`, `mime`, family by `/` or `/*`); `hostActionApplies` in `filesBrowser.js`.
  - `tests/components/CnFilesBrowserHostRows.spec.js` (hostActionApplies, host rows)
- [x] 1.4 Docs: `docs/components/cn-files-browser.md` (visibleIf, from a manifest), generated partials.
- [ ] 2.1 `bulkActions`: checkbox per file (never a folder or a linked row), select all, a bar with the count, the host's bulk actions and Clear selection; `open-modal` gets `files` and `fileIds`, `handler` gets the nodes; selection clears after a dispatch and on navigation.
- [ ] 2.2 `groupBy`: files grouped under a heading per value of a declared column, with a count, empty value last.
- [ ] 2.3 `facets`: a chip per value in use of each declared column (lists flattened) with its count; chips narrow the list (any within a facet, all across facets); a filter that matches nothing says so.
- [ ] 2.4 `CnFilesTab` forwards `bulkActions`, `groupBy`, `facets`; en and nl strings; docs.
