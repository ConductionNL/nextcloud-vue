---
sidebar_position: 33
---

# CnFileManager

File-list widget with drag-drop upload, per-file actions, and a click-emit for preview. The widget owns the dropzone UI, the row rendering, the icon-by-extension mapping, and the size/timestamp formatting. Consumers wire actual uploads / downloads / deletes through the `@upload`, `@download`, `@delete` events.

## Try it

```vue
<CnFileManager
  title="Attachments"
  :files="attachments"
  accept=".pdf,.png,.jpg"
  :multiple="true"
  :max-size-mb="20"
  @upload="onUpload"
  @download="onDownload"
  @delete="onDelete"
  @file-click="openPreview"
  @upload-rejected="onUploadRejected" />
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `files` | `Array<{id?,name,size?,type?,url?,uploadedAt?,uploadedBy?}>` | `[]` | Files to render. |
| `title` / `description` | String | `''` | Optional header. |
| `readOnly` | Boolean | `false` | Hide dropzone + Delete buttons. |
| `accept` | String | `''` | `accept` attribute for the file input. |
| `multiple` | Boolean | `true` | Allow multi-file selection. |
| `maxSizeMb` | Number | `0` | Per-file max size in MB (0 = no limit). |
| `dropzoneLabel` | String | `'Drop files here or click to browse'` | Dropzone primary label. |
| `dropzoneHint` | String | `''` | Dropzone secondary hint. |
| `emptyLabel` | String | `'No files attached.'` | Empty-state text. |
| `downloadLabel` | String | `'Download'` | Default action label. |
| `deleteLabel` | String | `'Delete'` | Default action label. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `upload` | `File[]` | Files dropped or picked. Consumer persists them then appends to `files[]`. |
| `upload-rejected` | `{reason,file,limitMb}` | Validation rejection (currently `reason: 'size'`). |
| `download` | `file` | Download button clicked. |
| `delete` | `file` | Delete button clicked. Button becomes disabled until parent removes the file or calls `clearDeleting(id)`. |
| `file-click` | `file` | Row clicked (not the action buttons). Use for preview / detail. |

## Public methods

| Method | Description |
|--------|-------------|
| `openFilePicker()` | Programmatic dropzone open (from a parent button). |
| `clearDeleting(id)` | Reset the in-flight delete flag for a file (on persist failure). |

## Slots

- `#header` — replaces the title/description header.
- `#item-actions` — per-file actions. Scope: `{ file }`. Default renders Download + Delete buttons.

## See also

- For OpenRegister-backed file attachments, convert the `_files` array into this prop shape and persist deletes via the object store.
