# CnObjectFilesWidget

The files of one OpenRegister object: list, upload (button or drag and drop) and delete, through `/apps/openregister/api/objects/{register}/{schema}/{id}/files`.

On a manifest `detail` page a `files` widget mounts this instead of the placement-folder `CnFilesWidget`, which stays the dashboard widget. A consumer registry entry for `files` still wins. The register, schema and id come from the props, or from the loaded object's `@self`. Without an object id (a record not saved yet) upload is disabled and the widget says so.

An upload posts JSON `{ name, content }` (content as a data URL) to the files endpoint; delete calls `DELETE .../files/{fileId}`.

## Usage

```vue
<CnObjectFilesWidget :object-data="pet" />
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `register` | String | `''` | Register slug or id. Empty: `objectData['@self'].register`. |
| `schema` | String | `''` | Schema slug or id. Empty: `objectData['@self'].schema`. |
| `objectId` | String, Number | `''` | Object id. Empty: `objectData['@self'].id`. |
| `objectData` | Object | `{}` | The loaded object; its `@self` supplies the context the props leave empty. |
| `readOnly` | Boolean | `false` | Hide upload and delete. |
| `apiBase` | String | `/apps/openregister/api/objects` | Object API base. |
| `uploadLabel` | String | "Upload file" | Label of the upload button. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `uploaded` | file names | Files were attached to the object. |
| `deleted` | file id | A file was removed from the object. |
| `error` | Error | Listing, uploading or deleting failed. |

## Slots

None.
