import GeneratedRef from './_generated/CnFolderSidebar.md'

# CnFolderSidebar

Source-agnostic folder navigation sidebar. Renders an "All" reset entry plus a (nested) folder tree, and emits `select` with the chosen folder id (or `null` for "All"). Drop it into an index page's sidebar to filter the list by folder.

## Folder sources (`source` prop)

- **`custom`** (default) — the parent supplies `folders` (flat with `parentField`, or already-nested via `childrenField`) and handles CRUD via the `create` / `rename` / `delete` events. Fits app-owned folder tables, OpenRegister folder objects, anything.
- **`field`** — no folder entity: the tree is built from the distinct values of a `groupBy` field across `objects`. Lightweight grouping, no nesting.
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
