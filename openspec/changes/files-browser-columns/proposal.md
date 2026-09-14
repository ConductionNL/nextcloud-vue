---
kind: code
---

# Proposal: files-browser-columns

## Summary

Let `CnFilesBrowser` show columns the host declares: a node attribute, a
DAV property, or a value from an object the host keeps per file. Today the
table is fixed at name, size and modified. A document list on a case wants
sender, recipient, direction, the scan verdict, a document type; none of
those live on the node, all of them live on the host's projection.

Opened from the dossiq competitor gap register, row 4.8 "Configurable
document list columns" (`procest/_gaps/gap-register.md` in
ConductionNL/market-intelligence, 2026-09-13). Rated no, owner
nextcloud-vue, size S. Small-owner lane of the OpenSpec phase.

## Motivation

`CnFilesBrowser` (`src/components/CnFilesBrowser/CnFilesBrowser.vue`)
renders `<th>` for icon, name, size, mtime and actions, and nothing else.
dossiq's nearest surface is the `CnIndexPage` column chooser on `#Cases`,
which is cases, not documents (register note). The best competitor in
the register: GZAC/Valtimo,
`backend/zgw/documenten-api/src/main/kotlin/com/ritense/documentenapi/domain/DocumentenApiColumnKey.kt`
(`_round2/compare/M1-functionality.md`).

Two dossiq changes already wait on this one and name the slug:
`document-correspondents` (Sender and Recipient columns, row 5.12) and
`scan-verdict-on-the-row` (a Scan column, row 4.19). Both read values that
are not on the node: the first from dossiq's document projection, the
second from `files_antivirus`'s DAV property.

## Affected projects

- `nextcloud-vue`: `CnFilesBrowser`, the `files` integration widget config
  in the manifest v2 schema, `CnCellRenderer` (reused).
- Consumers: dossiq (Files tab), filinq (documents), shillinq
  (`integration-leaves-consume` file widgets), every host of the `files`
  leaf.

## Backward compatibility

No `columns` means the three columns of today, in today's order. The
manifest v2 validator accepts the new optional key and rejects nothing it
accepted before. `rowActions`, `linkedItems` and every label prop are
untouched.

## Theming

None. The header row is the existing `cn-files-browser` table; new cells
render through `CnCellRenderer`, which already follows the theme.
