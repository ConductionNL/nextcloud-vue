# filesPlugin

Adds file-attachment management to the object store: fetch, upload (multipart), publish/unpublish, delete, plus a shared tags list used to label files.

Extends the generic sub-resource plugin built by [`createSubResourcePlugin`](../sub-resource-plugin.md) for the `files` endpoint.

## Usage

```js
import { createObjectStore, filesPlugin } from '@conduction/nextcloud-vue'

const useMyStore = createObjectStore('myapp', {
  plugins: [filesPlugin()],
})

const store = useMyStore()

// List
await store.fetchFiles('case', caseId)
console.log(store.files.results)

// Upload
const formData = new FormData()
formData.append('files[]', file)
await store.uploadFiles('case', caseId, formData)

// Publish / unpublish / delete
await store.publishFile('case', caseId, fileId)
await store.unpublishFile('case', caseId, fileId)
await store.deleteFile('case', caseId, fileId)

// Tags
await store.fetchTags()   // populates store.tags (array of strings)
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `limit` | `number` | `20` | Default page size for `fetchFiles` |

## State

Files (from `createSubResourcePlugin`):

| Property | Type |
|----------|------|
| `files` | `{ results, total, page, pages, limit, offset }` |
| `filesLoading` | `boolean` |
| `filesError` | `ApiError \| null` |

Tags:

| Property | Type | Description |
|----------|------|-------------|
| `tags` | `string[]` | Flat array of tag strings |
| `tagsLoading` | `boolean` | |
| `tagsError` | `ApiError \| null` | |

## Getters

`getFiles`, `isFilesLoading`, `getFilesError`, `getTags`, `isTagsLoading`, `getTagsError`.

## Actions

| Action | Signature | Description |
|--------|-----------|-------------|
| `fetchFiles` | `(type, objectId, params?) => Promise<Array>` | From `createSubResourcePlugin`. |
| `uploadFiles` | `(type, objectId, formData) => Promise<object \| null>` | POSTs multipart form data to `<object>/filesMultipart`. `FormData` should contain `files[]` plus optional tags/share fields. On success, re-fetches the files list. |
| `publishFile` | `(type, objectId, fileId) => Promise<boolean>` | POST `<object>/files/<fileId>/publish`. Re-fetches on success. |
| `unpublishFile` | `(type, objectId, fileId) => Promise<boolean>` | POST `<object>/files/<fileId>/depublish`. Re-fetches on success. |
| `deleteFile` | `(type, objectId, fileId) => Promise<boolean>` | DELETE `<object>/files/<fileId>`. Re-fetches on success. |
| `batchFiles` | `(type, objectId, action, fileIds, params?) => Promise<object \| null>` | POST `<object>/files/batch` to apply `publish` / `depublish` / `delete` / `label` across many files in ONE round-trip. Returns `{ results, summary: { succeeded, failed, total } }` for both 200 (all OK) and 207 (partial). Re-fetches on success. |
| `fetchTags` | `() => Promise<string[]>` | GET the tags endpoint (derived from `baseUrl` by replacing `/objects` with `/tags`). Returns the array (also stored in `state.tags`). |
| `clearFiles` | `() => void` | From `createSubResourcePlugin`. Reset files state. |

## Notes

- `uploadFiles` calls `buildHeaders(null)` so the browser sets the correct multipart `Content-Type` boundary.
- Errors from network failures (`TypeError`) are wrapped via [`networkError`](../../utilities/network-error.md); other errors are surfaced with their message.
