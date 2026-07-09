# fetchWebdavFolderTree

The default WebDAV folder loader for [`CnFolderSidebar`](../components/cn-folder-sidebar.md)'s `files` source. PROPFINDs the current user's files under `path` and returns immediate child collections (folders), recursing up to `depth` levels.

```js
import { fetchWebdavFolderTree } from '@conduction/nextcloud-vue'

const tree = await fetchWebdavFolderTree({ path: '/Vault', depth: 1 })
// → [{ id: '/Vault/Personal', name: 'Personal', icon: 'Folder', children: [] }, …]
```

Each node's `id` is the folder's path relative to the files root — the value `CnFolderSidebar` emits from `@select`. Because servers commonly forbid `Depth: infinity`, the loader issues one `Depth: 1` request per folder, bounded by `depth`.

| Param | Type | Description |
|-------|------|-------------|
| `ctx.path` | `string` | Files-root-relative path to list (e.g. `/Vault`). |
| `ctx.depth` | `number` | How many levels to recurse (`1` = immediate children only). |

Pass a custom loader to `CnFolderSidebar` via its `fetcher` prop to override this (e.g. in tests or to hit a different backend).
