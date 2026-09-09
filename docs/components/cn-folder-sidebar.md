import GeneratedRef from './_generated/CnFolderSidebar.md'

# CnFolderSidebar

Source-agnostic folder navigation sidebar. Renders an "All" reset entry plus a (nested) folder tree, and emits `select` with the chosen folder id (or `null` for "All"). Drop it into an index page's sidebar to filter the list by folder.

## Folder sources (`source` prop)

- **`custom`** (default) — the parent supplies `folders` (flat with `parentField`, or already-nested via `childrenField`) and handles CRUD via the `create` / `rename` / `delete` events. Fits app-owned folder tables, OpenRegister folder objects, anything.
- **`field`** — no folder entity: the tree is built from the distinct values of a `groupBy` field. Lightweight grouping, no nesting.

  `objects` is normally one page of a longer list, and folders derived from a page alone are incomplete: they shift as the reader pages, their counts are per-page tallies, and a value whose rows all sit on a later page has no folder at all. Pass `facetValues` to avoid that. A facet is computed with the pagination parameters removed, so it carries every distinct value with its true total, and it replaces the row grouping entirely. Any property marked `facetable: true` gets one. Where no facet is available, set `partial` so the counts are dropped rather than shown as totals.
- **`files`** — real Nextcloud folders/collections under `filesPath`, loaded over WebDAV via [`fetchWebdavFolderTree`](../utilities/fetch-webdav-folder-tree.md) (override with the `fetcher` prop, e.g. for tests).

```vue
<!-- App-owned folders -->
<CnFolderSidebar :folders="folderTree" :selected-id="folderId" allow-create
  @select="onFolder" @create="onCreateFolder" />

<!-- Group by any field -->
<CnFolderSidebar source="field" :objects="rows" group-by="status"
  :selected-id="status" @select="onFolder" />

<!-- Real Nextcloud folders -->
<CnFolderSidebar source="files" files-path="/Vault" :selected-id="path" @select="onFolder" />
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `source` | String | `'custom'` | Folder source: `custom` \| `field` \| `files`. |
| `folders` | Array | `[]` | `custom` source: the folders (flat or nested). |
| `objects` | Array | `[]` | `field` source: the objects whose values become folders. |
| `groupBy` | String | `''` | `field` source: the property to group by. |
| `facetValues` | Array | `[]` | `field` source: facet buckets for `groupBy` (`{ value, count?, label? }`). Computed across the whole query, so they replace the row grouping when present. |
| `partial` | Boolean | `false` | `field` source: whether `objects` is only part of the result set. Suppresses per-page counts and shows a notice. |
| `partialLabel` | String | `'Folders cover this page only.'` | The notice shown when `partial` is set and no facet is available. |
| `filesPath` | String | `'/'` | `files` source: root path to list. |
| `maxDepth` | Number | `1` | `files` source: recursion depth. |
| `fetcher` | Function | `null` | `files` source: async loader override. |
| `selectedId` | String \| Number | `null` | The selected folder id (`null` = All). |
| `title` | String | `''` | Optional heading above the tree. |
| `allLabel` | String | *(i18n)* | Label for the "All" reset entry. |
| `allIcon` | String | `''` | MDI name for the "All" entry (empty = built-in). |
| `idField` / `nameField` / `parentField` / `childrenField` | String | `id` / `name` / `parentId` / `children` | Field names for the `custom` source. |
| `allowCreate` | Boolean | `false` | Show a "New folder" button. |
| `createLabel` | String | *(i18n)* | Label for the New-folder button. |

## Events

- `@select(id \| null)` — a folder (or "All") was chosen.
- `@create({ parentId })` — the New-folder button was clicked (opt-in).

<GeneratedRef />
