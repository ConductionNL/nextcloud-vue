# Design: files browser columns

## Component and surface

`CnFilesBrowser` (`src/components/CnFilesBrowser/`) and the `files`
integration widget config of the manifest v2 schema
(`src/manifest/schema/`).

Kind: code, plus a schema extension consumed as config by apps.

## Column shape

A `columns` prop, and the same key on the `files` widget config:

```json
"columns": [
  "name", "size", "modified",
  { "key": "sender", "label": "Sender", "source": "row" },
  { "key": "scan", "label": "Scan", "source": "attribute",
    "attribute": "{http://owncloud.org/ns}av-status", "formatter": "scanVerdict" },
  { "key": "owner", "source": "node", "sortable": true }
]
```

- A string names a built-in column: `name`, `size`, `modified`, `owner`,
  `type`, `tags`.
- An object declares `key`, `label` (default: the key, humanised),
  `source` (`node`, `attribute`, `row`), `attribute` (the DAV property
  when `source: attribute`), `formatter` (a consumer formatter id, the
  `manifest-column-formatters` registry) and `sortable` (default `true`
  for `node`, `false` otherwise).
- `source: node` reads a property of the `@nextcloud/files` node.
  `source: attribute` reads `node.attributes[attribute]` and asks for that
  property in the PROPFIND the component already sends. `source: row`
  reads `rowData[node.fileid][key]`.

## Row data from the host

A `rowData` prop: either an object keyed by `fileid`, or a function
`(nodes) => Promise<object>` the component calls once per listed folder
so the host can fetch its projection in one query. Absent, every `row`
column renders empty. The host owns the projection; the component never
guesses where a value comes from.

## Resolution in CnFilesBrowser

1. `columns` prop, else the widget config's `columns`, else the three
   defaults.
2. For each `attribute` column, add the property to the PROPFIND
   `getDefaultPropfind()` list before listing.
3. Render each declared column as a `<th scope="col">` with `aria-sort`
   when sortable, and each cell through `CnCellRenderer` with `formatter`
   and the full node as `row`.
4. Sorting on a `node` column reuses `sortBy`; a `row` or `attribute`
   column marked sortable sorts on the resolved value client-side within
   the listed folder.

## Column chooser

A Columns entry in the toolbar's overflow menu, listing the declared
columns with checkboxes, stored per user under
`cn-files-browser:<hostKey>:columns` in the store plugin that
`useListView` already uses for `visibleColumns`. The declared list is the
ceiling; the chooser hides, never adds.

## Alternatives considered

- Render the Files app's list. Rejected: the component's own header
  explains why that list cannot be mounted here.
- Let the component query the host's register for the projection.
  Rejected: the component would need to know a schema; `rowData` keeps
  the projection the host's business.
