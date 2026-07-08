import GeneratedRef from './_generated/CnFolderTree.md'

# CnFolderTree

Recursive presentational folder tree. Renders a (possibly nested) list of `{ id, name, icon?, count?, children? }` folders and emits `select` with a folder id when one is clicked. Purely presentational — data loading and CRUD live in [`CnFolderSidebar`](./cn-folder-sidebar.md).

```vue
<CnFolderTree :folders="tree" :selected-id="active" @select="onSelect" />
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `folders` | Array | `[]` | Folders at this level; each may carry a `children` array. |
| `selectedId` | String \| Number | `null` | The currently selected folder id. |

<GeneratedRef />
