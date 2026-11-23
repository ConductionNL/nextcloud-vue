# createOpenRegisterSource

Builds the data source that lets [`CnFilesBrowser`](../components/cn-files-browser.md) read and write one OpenRegister object's folder through OpenRegister's files API instead of WebDAV.

## Why

OpenRegister keeps every object folder in its own `openregister` account, out of each person's Files app, and decides file access from the object. A reader therefore has no WebDAV path to an object's files. This source goes through OpenRegister, as the signed-in person, so whoever may read the object sees its folder and subfolders, and only a person who may update the object can change them. No share is created.

## Signature

```js
import { createOpenRegisterSource } from '@conduction/nextcloud-vue'

const source = createOpenRegisterSource({ apiBase, register, schema, objectId })
```

| Argument | Type | Description |
|----------|------|-------------|
| `apiBase` | `string` | OpenRegister's API base. Defaults to `/apps/openregister/api`. |
| `register` | `string` | The register slug or id. |
| `schema` | `string` | The schema slug or id. |
| `objectId` | `string` | The object's uuid. |

## Return value

An object `CnFilesBrowser` takes as its `source` prop. Paths are relative to the object folder, written with a leading slash (`/`, `/Bijlagen`).

| Member | Does |
|--------|------|
| `list(path)` | Lists a folder. Resolves to the folder (with `canChange`) and its rows; rejects with `status` 404 when the person may not read the object, 501 when the OpenRegister has no folder endpoint. |
| `createFolder(path, name)` | Creates a folder. |
| `upload(path, file, onProgress?)` | Uploads one file through OpenRegister's upload pipeline. A taken name rejects with `status` 409. |
| `rename(node, name)` | Renames a file or folder. |
| `remove(node)` | Deletes a file or folder. |
| `downloadUrl(node)` | The object's own file endpoint for a file; null for a folder. |
| `previewUrl(node)` | A small preview through the object's preview endpoint. |

## Usage

```vue
<CnFilesBrowser root-path="/" :source="source" :root-label="caseTitle" />
```

`CnFilesTab` builds this source itself for an object (its `source` prop defaults to `'openregister'`).

It needs an OpenRegister with the object folder endpoints (`/api/objects/<register>/<schema>/<id>/folder`).
